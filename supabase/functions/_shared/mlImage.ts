// Resolves the real product photo of a Mercado Libre listing.
// Mercado Libre image URLs use a picture ID unrelated to the item ID, so the
// photo has to be read from the listing page (og:image) instead of guessed.

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-AR,es;q=0.9',
};

/** True for URLs built from the item ID, which always show Mercado Libre's placeholder. */
export function isGuessedMlThumbnail(url: string | null | undefined, productId: string) {
  if (!url) return true;
  return url.includes(`D_NQ_NP_${productId}-`);
}

export function extractMlImageFromHtml(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  const candidate = og?.[1]
    ?? html.match(/https:\/\/http2\.mlstatic\.com\/D_(?:NQ_NP_)?(?:2X_)?\d+-[A-Z]{3}\d+_\d+-[A-Z]\.(?:webp|jpg|jpeg|png)/i)?.[0];
  if (!candidate) return null;
  if (!candidate.includes('mlstatic.com') || candidate.includes('frontend-assets')) return null;
  return candidate.replace(/^http:/, 'https:');
}

function candidateUrls(permalink: string, productId: string) {
  const urls = [permalink];
  const digits = productId.match(/^MLA(\d+)$/i)?.[1];
  if (digits) urls.push(`https://articulo.mercadolibre.com.ar/MLA-${digits}`);
  return [...new Set(urls)];
}

export async function resolveMlImage(permalink: string, productId: string): Promise<string | null> {
  for (const url of candidateUrls(permalink, productId)) {
    try {
      const response = await fetch(url, { headers: BROWSER_HEADERS, redirect: 'follow', signal: AbortSignal.timeout(8000) });
      if (!response.ok || response.url.includes('account-verification')) {
        console.log('ML image fetch blocked', response.status, response.url);
        continue;
      }
      const image = extractMlImageFromHtml(await response.text());
      if (image) return image;
    } catch (error) {
      console.log('ML image fetch failed', String(error));
    }
  }
  return null;
}
