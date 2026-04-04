const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractMetaContent(html: string, property: string): string | null {
  // Try og: and other meta properties
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractPrice(html: string): { price: number; currency: string } {
  // Try JSON-LD first
  const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      const jsonStr = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
      try {
        const data = JSON.parse(jsonStr);
        if (data?.offers?.price) {
          return { price: Number(data.offers.price), currency: data.offers.priceCurrency || 'ARS' };
        }
        if (data?.offers?.[0]?.price) {
          return { price: Number(data.offers[0].price), currency: data.offers[0].priceCurrency || 'ARS' };
        }
      } catch { /* skip */ }
    }
  }
  
  // Fallback: try meta tag
  const priceStr = extractMetaContent(html, 'product:price:amount') || extractMetaContent(html, 'og:price:amount');
  if (priceStr) {
    const currency = extractMetaContent(html, 'product:price:currency') || 'ARS';
    return { price: Number(priceStr), currency };
  }
  
  return { price: 0, currency: 'ARS' };
}

function extractItemId(url: string): string | null {
  // Try item_id param
  const itemIdParam = url.match(/item_id[=:](?:MLA-?)(\d+)/i);
  if (itemIdParam) return `MLA${itemIdParam[1]}`;
  
  // Try wid param
  const widMatch = url.match(/[?&#]wid=(MLA-?\d+)/i);
  if (widMatch) return widMatch[1].replace(/-/g, '');
  
  // Try articulo URL pattern
  const artMatch = url.match(/articulo\.mercadolibre\.[^/]+\/(MLA-?\d+)/i);
  if (artMatch) return artMatch[1].replace(/-/g, '');
  
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL es requerida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean URL (remove fragment)
    const cleanUrl = url.split('#')[0];
    console.log('Fetching product page:', cleanUrl);

    // Fetch the actual product page
    const pageResponse = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9',
      },
      redirect: 'follow',
    });

    if (!pageResponse.ok) {
      console.error('Page fetch error:', pageResponse.status);
      return new Response(
        JSON.stringify({ error: 'No se pudo acceder al producto. Verificá el link.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await pageResponse.text();
    
    // Extract data from meta tags
    const title = extractMetaContent(html, 'og:title') || extractMetaContent(html, 'twitter:title') || 'Producto de Mercado Libre';
    const image = extractMetaContent(html, 'og:image') || extractMetaContent(html, 'twitter:image');
    const permalink = extractMetaContent(html, 'og:url') || cleanUrl;
    const { price, currency } = extractPrice(html);
    
    // Extract product ID
    const productId = extractItemId(url) || extractItemId(permalink) || `ML-${Date.now()}`;

    // Check for free shipping in page content
    const freeShipping = html.includes('Llega gratis') || html.includes('Envío gratis') || html.includes('free_shipping":true');

    const thumbnail = image?.replace(/-O\./, '-D_NQ_NP_') || image || '';

    const product = {
      product_id: productId,
      title: title.replace(' | MercadoLibre', '').replace(' - MercadoLibre', '').trim(),
      price,
      currency,
      thumbnail: thumbnail,
      image: image || null,
      permalink,
      free_shipping: freeShipping,
      seller: null,
    };

    console.log('Extracted product:', JSON.stringify({ title: product.title, price: product.price, productId: product.product_id }));

    if (!product.title || product.title === 'Producto de Mercado Libre') {
      return new Response(
        JSON.stringify({ error: 'No se pudieron extraer los datos del producto. Probá con otro link.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, product }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Error al procesar el link' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
