/**
 * Registra el service worker de la PWA solo en producción y fuera de
 * los entornos de preview de Lovable. En cualquier otro caso desregistra
 * un /sw.js existente para evitar cachés obsoletos en desarrollo.
 */
export async function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const hostname = window.location.hostname;
  const search = window.location.search;
  const isIframe = window.self !== window.top;

  const isPreview =
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev");

  const shouldRefuse =
    !import.meta.env.PROD || isIframe || isPreview || search.includes("sw=off");

  if (shouldRefuse) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter((r) => r.scope.endsWith("/") && r.active?.scriptURL?.endsWith("/sw.js"))
          .map((r) => r.unregister())
      );
    } catch {
      // Ignorar errores de limpieza en dev/preview
    }
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    // Cuando el nuevo service worker toma el control, recargamos una sola vez
    // para que el usuario vea siempre la última versión publicada.
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });

    // Chequeos de actualización: al iniciar, al volver a la pestaña/app y
    // periódicamente mientras está abierta.
    const checkForUpdate = () => {
      registration.update().catch(() => {});
    };

    checkForUpdate();
    window.addEventListener("focus", checkForUpdate);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
    setInterval(checkForUpdate, 60 * 1000);
  } catch (err) {
    console.error("Error registrando el service worker:", err);
  }
}
