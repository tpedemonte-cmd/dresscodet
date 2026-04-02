import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, category, offset = 0, limit = 20, priceRange, freeShipping } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const categoryMap: Record<string, string> = {
      remera: "MLA109282",
      pantalon: "MLA109276",
      campera: "MLA109270",
      zapatillas: "MLA108495",
      vestido: "MLA109284",
      camisa: "MLA109272",
      buzo: "MLA109270",
      jean: "MLA109276",
      short: "MLA109278",
      pollera: "MLA109280",
      accesorios: "MLA1430",
    };

    let url = `https://api.mercadolibre.com/sites/MLA/search?q=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}`;
    
    if (category && categoryMap[category]) {
      url += `&category=${categoryMap[category]}`;
    }

    // Price filter
    if (priceRange) {
      const [min, max] = priceRange.split("-");
      if (max === "*") {
        url += `&price=${min}-`;
      } else {
        url += `&price=${min}-${max}`;
      }
    }

    // Free shipping filter
    if (freeShipping) {
      url += `&shipping_cost=free`;
    }

    url += "&condition=new&has_pictures=yes&sort=relevance";

    console.log("Searching ML:", url);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });
    if (!response.ok) {
      const text = await response.text();
      console.error("ML API error:", response.status, text);
      throw new Error(`Mercado Libre API error: ${response.status}`);
    }

    const data = await response.json();

    const products = (data.results || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      currency: item.currency_id,
      thumbnail: item.thumbnail?.replace("http://", "https://"),
      image: (item.thumbnail?.replace("http://", "https://") || "").replace("-I.jpg", "-O.jpg"),
      permalink: item.permalink,
      condition: item.condition,
      free_shipping: item.shipping?.free_shipping || false,
      seller: item.seller?.nickname || "Vendedor",
      available_quantity: item.available_quantity,
    }));

    return new Response(
      JSON.stringify({
        products,
        total: data.paging?.total || 0,
        offset: data.paging?.offset || 0,
        limit: data.paging?.limit || 20,
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
