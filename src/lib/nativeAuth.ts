import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';

export const OAUTH_REDIRECT = 'dresscode://auth-callback';

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

/**
 * Inicia el login con Google.
 * - En web: redirige normalmente.
 * - En la app nativa: abre el navegador del sistema (Chrome Custom Tabs)
 *   y al terminar vuelve a la app mediante el deep link dresscode://auth-callback.
 */
export async function startGoogleOAuth() {
  const native = isNativeApp();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: native ? OAUTH_REDIRECT : window.location.origin,
      skipBrowserRedirect: native,
    },
  });
  if (error) throw error;
  if (native && data?.url) {
    await Browser.open({ url: data.url });
  }
}

/**
 * Escucha el deep link de vuelta (dresscode://auth-callback#access_token=...)
 * y establece la sesión en la app.
 */
export function initNativeAuthListener() {
  if (!isNativeApp()) return;
  App.addListener('appUrlOpen', async ({ url }) => {
    if (!url) return;
    try {
      await Browser.close();
    } catch {
      /* el navegador ya estaba cerrado */
    }
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return;
    const params = new URLSearchParams(url.slice(hashIndex + 1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (!error) {
        window.location.replace('/');
      }
    }
  });
}
