# DressCode

Aplicación de guardarropas digital que recomienda qué ponerse según el clima y la ocasión, con las prendas que cada persona ya tiene, y que muestra cómo queda un conjunto mediante un probador virtual con inteligencia artificial.

Proyecto Final de Ingeniería en Informática · Facultad de Ingeniería · Universidad del Salvador (USAL) · 2026

**Versión publicada:** https://dresscodet.vercel.app

---

## Funcionalidades

- **Guardarropas:** carga de prendas a partir de una foto, con detección automática de nombre, categoría y color, y estados de disponibilidad (disponible, en lavado, prestada, en arreglo).
- **Probador virtual:** generación de un modelo del usuario a partir de datos corporales (o de una foto propia en el plan Premium) y de looks con las prendas elegidas.
- **Mis Looks y análisis de estilo:** galería de looks generados y sugerencias de prendas que faltan.
- **Sugerencias:** recomendación de outfit según el clima de la ubicación y el tipo de salida.
- **Plan semanal y viajes:** outfits para salidas futuras según el pronóstico, y qué llevar y qué comprar según el destino.
- **Favoritos, historial y estadísticas:** valoración de recomendaciones y análisis del uso de cada prenda.
- **Tienda y wishlist:** búsqueda de prendas en Mercado Libre y lista de deseos.
- **Planes Gratis y Premium:** cupos de uso, paquetes de outfits y avatares extra. Los pagos son **simulados** (entorno de prueba, sin cobro real).

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS, shadcn/ui, React Router, TanStack Query |
| Backend | Supabase: PostgreSQL, Auth, Storage y Edge Functions (Deno) |
| Inteligencia artificial | Google Gemini (API de Google) |
| Servicios externos | Open-Meteo (clima y ciudades), Nominatim / OpenStreetMap (ubicaciones), Mercado Libre |
| Móvil | Capacitor + Android Studio (APK para Android) |
| Despliegue | Vercel, con publicación automática desde la rama `main` |

## Estructura del repositorio

```
src/                    Código del frontend (páginas, componentes, hooks)
supabase/functions/     Edge Functions (lógica del servidor e integraciones)
supabase/migrations/    Esquema de la base de datos
android/                Proyecto Android generado con Capacitor
ios/                    Proyecto iOS generado con Capacitor (no publicado)
.env.example            Variables de entorno necesarias (sin valores)
```

Edge Functions: `detect-clothing`, `extract-ml-product`, `generate-avatar`, `mock-payments`, `recommend-outfit`, `refresh-plan-weather`, `search-marketplace`, `style-recommendations`, `travel-wardrobe` y `virtual-tryon`.

## Requisitos

- Node.js 20 o superior y npm
- Un proyecto de Supabase (el plan gratuito alcanza para probar)
- Una clave de la API de Google Gemini
- Supabase CLI, solo para desplegar la base de datos y las funciones
- Android Studio, solo para generar la versión de Android

## Instalación

```bash
git clone https://github.com/tpedemonte-cmd/dresscodet.git
cd dresscodet
npm install
```

## Configuración

1. Copiar el archivo de ejemplo y completar los valores de tu proyecto de Supabase (Supabase → Project Settings → API):

   ```bash
   cp .env.example .env
   ```

   | Variable | Descripción |
   |---|---|
   | `VITE_SUPABASE_URL` | URL del proyecto de Supabase |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública (publishable) del proyecto |
   | `VITE_SUPABASE_PROJECT_ID` | ID del proyecto |
   | `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | Los mismos valores, para herramientas fuera del navegador |

2. Crear la base de datos y desplegar las funciones del servidor:

   ```bash
   supabase login
   supabase link --project-ref <ID_DEL_PROYECTO>
   supabase db push
   supabase functions deploy
   ```

3. Cargar el secreto de la inteligencia artificial en Supabase (nunca en el repositorio):

   ```bash
   supabase secrets set GEMINI_API_KEY=<tu_clave_de_google>
   ```

   Las variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` las provee Supabase automáticamente a las funciones. El código también admite `LOVABLE_API_KEY` como alternativa, pero no es necesaria si se usa `GEMINI_API_KEY`.

## Ejecución

```bash
npm run dev
```

La aplicación queda disponible en la dirección que muestra la terminal (por defecto, http://localhost:8080).

Para generar la versión de producción:

```bash
npm run build
```

## Versión para Android

```bash
npm run build
npx cap sync android
npx cap open android
```

Desde Android Studio: **Build → Build APK(s)**, o ejecutar directamente en un teléfono conectado.

## Despliegue

Cada cambio que se sube a la rama `main` se publica automáticamente en Vercel. Las variables `VITE_SUPABASE_*` están cargadas en Vercel → Settings → Environment Variables.

## Autor

**Taddeo Pedemonte** · Proyecto Final de Ingeniería en Informática, USAL · Profesor: Esteban Tissera

## Licencia

Distribuido bajo la licencia MIT. Ver el archivo [LICENSE](LICENSE).