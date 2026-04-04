import { corsHeaders } from '@supabase/supabase-js/cors'

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

    // Extract item ID from ML URL patterns:
    // https://articulo.mercadolibre.com.ar/MLA-123456789-title_JM
    // https://www.mercadolibre.com.ar/.../p/MLA12345678
    // MLA-123456789
    const patterns = [
      /MLA-?\d+/i,
    ];

    let itemId: string | null = null;
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        itemId = match[0].replace('-', '');
        // Normalize: ensure format is MLA + digits
        if (!itemId.startsWith('MLA')) {
          itemId = 'MLA' + itemId;
        }
        break;
      }
    }

    if (!itemId) {
      return new Response(
        JSON.stringify({ error: 'No se pudo extraer el ID del producto. Asegurate de pegar un link válido de Mercado Libre.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching ML item:', itemId);

    const response = await fetch(`https://api.mercadolibre.com/items/${itemId}`);
    
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
