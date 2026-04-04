const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    // Validate it's a Mercado Libre URL
    if (!url.includes('mercadolibre.com') && !url.includes('mercadolibre.co')) {
      return new Response(
        JSON.stringify({ error: 'El link debe ser de Mercado Libre' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract title from URL slug
    // Patterns: /product-name-slug/p/MLA... or /MLA-123-product-name-slug_JM
    let title = '';
    
    // Try path-based title: /campera-safari-de-piel-sintetica-mujer/p/...
    const slugMatch = url.match(/mercadolibre\.[^/]+\/([^/]+)\/(p|up)\//i);
    if (slugMatch) {
      title = slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    
    // Try articulo pattern: /MLA-123-product-name_JM
    if (!title) {
      const artMatch = url.match(/MLA-?\d+-([^?#]+?)_JM/i);
      if (artMatch) {
        title = artMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
    }

    // Extract product ID
    let productId = `ML-${Date.now()}`;
    const itemIdParam = url.match(/item_id[=:](?:MLA-?)(\d+)/i);
    const widMatch = url.match(/[?&#]wid=(MLA-?\d+)/i);
    const artIdMatch = url.match(/\/(MLA-?\d+)/i);
    
    if (itemIdParam) productId = `MLA${itemIdParam[1]}`;
    else if (widMatch) productId = widMatch[1].replace(/-/g, '');
    else if (artIdMatch) productId = artIdMatch[1].replace(/-/g, '');

    // Clean permalink (remove tracking params after #)
    const permalink = url.split('#')[0];

    // Try to build a thumbnail from the product ID
    const thumbnail = `https://http2.mlstatic.com/D_NQ_NP_${productId}-MLA_O.webp`;

    const product = {
      product_id: productId,
      title: title || '',
      permalink,
      thumbnail,
    };

    console.log('Extracted from URL:', JSON.stringify(product));

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
