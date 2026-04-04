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

    // Extract item ID from various ML URL patterns:
    // 1. wid query param: ?wid=MLA1597168171
    // 2. articulo URL: /MLA-123456789-title_JM
    // 3. product URL: /p/MLA12345678
    // 4. Direct ID: MLA-123456789
    
    let itemId: string | null = null;
    
    // First try wid param (universal product pages use this)
    const widMatch = url.match(/[?&]wid=(MLA\d+)/i);
    if (widMatch) {
      itemId = widMatch[1].toUpperCase();
    }
    
    // Then try standard item patterns (skip MLAU universal IDs)
    if (!itemId) {
      const itemMatch = url.match(/\b(MLA)-?(\d{8,})/i);
      if (itemMatch) {
        const prefix = itemMatch[1].toUpperCase();
        const digits = itemMatch[2];
        // Skip if it's actually MLAU (universal product, not an item)
        const fullContext = url.substring(url.indexOf(itemMatch[0]) - 1, url.indexOf(itemMatch[0]) + itemMatch[0].length + 1);
        if (!fullContext.includes('MLAU')) {
          itemId = `${prefix}${digits}`;
        }
      }
    }

    // Fallback: try to find item ID in articulo subdomain pattern
    if (!itemId) {
      const articuloMatch = url.match(/articulo\.mercadolibre\.[^/]+\/(MLA-?\d+)/i);
      if (articuloMatch) {
        itemId = articuloMatch[1].replace(/-/g, '').toUpperCase();
        if (!itemId.startsWith('MLA')) itemId = 'MLA' + itemId;
      }
    }

    console.log('URL received:', url);
    console.log('Extracted item ID:', itemId);

    if (!itemId) {
      return new Response(
        JSON.stringify({ error: 'No se pudo extraer el ID del producto. Asegurate de pegar un link válido de Mercado Libre (desde "articulo.mercadolibre..." o copiá el link del producto).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format ID with dash for API: MLA928503634 -> MLA-928503634
    const formattedId = itemId.replace(/^(MLA)(\d+)$/, '$1-$2');
    console.log('Fetching ML item:', formattedId);

    const response = await fetch(`https://api.mercadolibre.com/items/${formattedId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('ML API error:', response.status);
      return new Response(
        JSON.stringify({ error: 'No se encontró el producto. Verificá el link.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const item = await response.json();

    const product = {
      product_id: item.id,
      title: item.title,
      price: item.price,
      currency: item.currency_id || 'ARS',
      thumbnail: item.thumbnail?.replace('http://', 'https://') || '',
      image: item.pictures?.[0]?.secure_url || item.secure_thumbnail || null,
      permalink: item.permalink,
      free_shipping: item.shipping?.free_shipping || false,
      seller: item.seller_id ? `Vendedor ${item.seller_id}` : null,
    };

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
