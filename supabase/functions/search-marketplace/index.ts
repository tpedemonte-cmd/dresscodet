import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, offset = 0, limit = 24, priceRange, freeShipping } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build Mercado Libre public listing URL and scrape results
    let searchUrl = `https://listado.mercadolibre.com.ar/${encodeURIComponent(query.replace(/ /g, '-'))}`;

    // Add price filter to URL
    if (priceRange) {
      const [min, max] = priceRange.split("-");
      if (max === "*") {
        searchUrl += `_PriceRange_${min}-0`;
      } else {
        searchUrl += `_PriceRange_${min}-${max}`;
      }
    }

    if (freeShipping) {
      searchUrl += "_Frete_Grátis";
    }

    searchUrl += "_NoIndex_true";

    console.log("Fetching ML page:", searchUrl);

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      console.error("ML page error:", response.status);
      throw new Error(`Failed to fetch results: ${response.status}`);
    }

    const html = await response.text();

    // Extract product data from the HTML using regex patterns
    const products: any[] = [];

    // Match individual product items - ML uses specific patterns in their HTML
    // Look for JSON-LD structured data first
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonStr = match.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, '');
          const data = JSON.parse(jsonStr);
          
          if (data["@type"] === "ItemList" && data.itemListElement) {
            for (const item of data.itemListElement) {
              if (products.length >= limit) break;
              const product = item.item || item;
              if (product.name && product.offers) {
                products.push({
                  id: product.url?.match(/MLA-?\d+/)?.[0] || `ml-${products.length}`,
                  title: product.name,
                  price: product.offers?.price || product.offers?.lowPrice || 0,
                  currency: product.offers?.priceCurrency || "ARS",
                  thumbnail: product.image || "",
                  image: product.image || "",
                  permalink: product.url || product.offers?.url || "",
                  condition: "new",
                  free_shipping: false,
                  seller: "Vendedor",
                  available_quantity: 1,
                });
              }
            }
          }
        } catch {
          // Skip invalid JSON-LD blocks
        }
      }
    }

    // Fallback: extract from HTML patterns if JSON-LD didn't work
    if (products.length === 0) {
      // Try to find product links and data from the page
      const itemRegex = /data-tracking="([\s\S]*?)"/g;
      let itemMatch;
      while ((itemMatch = itemRegex.exec(html)) !== null && products.length < limit) {
        try {
          const trackData = JSON.parse(itemMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
          if (trackData.id) {
            products.push({
              id: trackData.id,
              title: trackData.title || "Producto",
              price: trackData.price || 0,
              currency: "ARS",
              thumbnail: "",
              image: "",
              permalink: `https://articulo.mercadolibre.com.ar/${trackData.id}`,
              condition: "new",
              free_shipping: false,
              seller: "Vendedor",
              available_quantity: 1,
            });
          }
        } catch {
          // Skip
        }
      }
    }

    // Second fallback: extract from promoted/organic listing patterns
    if (products.length === 0) {
      // Extract product cards using common ML patterns
      const linkRegex = /href="(https:\/\/(?:articulo|www)\.mercadolibre\.com\.ar\/[^"]+)"/g;
      const priceRegex = /aria-roledescription="Precio"[^>]*>[\s\S]*?(\d[\d.]*)/g;
      const titleRegex = /class="ui-search-item__title[^"]*"[^>]*>([^<]+)/g;
      const imgRegex = /data-src="(https:\/\/http2\.mlstatic\.com\/[^"]+)"/g;
      
      const links: string[] = [];
      const prices: number[] = [];
      const titles: string[] = [];
      const images: string[] = [];
      
      let m;
      while ((m = linkRegex.exec(html)) !== null) links.push(m[1]);
      while ((m = priceRegex.exec(html)) !== null) prices.push(parseFloat(m[1].replace(/\./g, '')));
      while ((m = titleRegex.exec(html)) !== null) titles.push(m[1]);
      while ((m = imgRegex.exec(html)) !== null) images.push(m[1]);

      const count = Math.min(links.length, limit);
      for (let i = 0; i < count; i++) {
        const idMatch = links[i].match(/MLA-?\d+/);
        products.push({
          id: idMatch?.[0] || `ml-${i}`,
          title: titles[i] || "Producto de Mercado Libre",
          price: prices[i] || 0,
          currency: "ARS",
          thumbnail: images[i] || "",
          image: images[i] || "",
          permalink: links[i],
          condition: "new",
          free_shipping: html.includes("Envío gratis"),
          seller: "Vendedor",
          available_quantity: 1,
        });
      }
    }

    // Extract total results count
    const totalMatch = html.match(/(\d[\d,.]*)\s*resultado/);
    const total = totalMatch ? parseInt(totalMatch[1].replace(/[.,]/g, '')) : products.length;

    return new Response(
      JSON.stringify({
        products,
        total,
        offset,
        limit,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("search-marketplace error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
