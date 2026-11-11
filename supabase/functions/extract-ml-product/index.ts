import { adminClient, authenticatedClient } from "../_shared/backend.ts";
import { isGuessedMlThumbnail, resolveMlImage } from "../_shared/mlImage.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-data-backend, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await authenticatedClient(req);
    if (!auth) return json({ error: 'Iniciá sesión para usar esta función.' }, 401);
    const body = await req.json();

    // Repair mode: find real photos for saved wishlist items that only have a guessed one.
    if (body?.action === 'refresh-images') {
      const { data: rows, error } = await auth.client
        .from('wishlist').select('id, product_id, permalink, thumbnail, image').eq('user_id', auth.user.id);
      if (error) throw error;
      const pending = (rows ?? []).filter((row) => !row.image && isGuessedMlThumbnail(row.thumbnail, row.product_id)).slice(0, 10);
      const updated: { id: string; image: string }[] = [];
      const admin = adminClient(auth.backend);
      for (const row of pending) {
        const image = await resolveMlImage(row.permalink, row.product_id);
        if (!image) continue;
        const { error: updateError } = await admin.from('wishlist')
          .update({ image, thumbnail: image }).eq('id', row.id).eq('user_id', auth.user.id);
        if (!updateError) updated.push({ id: row.id, image });
      }
      return json({ success: true, updated, checked: pending.length });
    }

    const { url } = body ?? {};

    if (!url || typeof url !== 'string') {
      return json({ error: 'URL es requerida' }, 400);
    }

    // Validate it's a Mercado Libre URL
    if (!url.includes('mercadolibre.com') && !url.includes('mercadolibre.co')) {
      return json({ error: 'El link debe ser de Mercado Libre' }, 400);
    }

    // Extract title from URL slug
    // Patterns: /product-name-slug/p/MLA... or /MLA-123-product-name-slug_JM
    let title = '';

    const slugMatch = url.match(/mercadolibre\.[^/]+\/([^/]+)\/(p|up)\//i);
    if (slugMatch) {
      title = slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

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

    // Read the real photo from the listing; keep the old guess only as a last resort.
    const realImage = await resolveMlImage(permalink, productId);
    const thumbnail = realImage ?? `https://http2.mlstatic.com/D_NQ_NP_${productId}-MLA_O.webp`;

    const product = {
      product_id: productId,
      title: title || '',
      permalink,
      thumbnail,
      image: realImage,
    };

    console.log('Extracted from URL:', JSON.stringify(product));

    return json({ success: true, product });
  } catch (error) {
    console.error('Error:', error);
    return json({ error: 'Error al procesar el link' }, 500);
  }
});
