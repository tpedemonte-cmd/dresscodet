import { authenticatedClient } from "../_shared/backend.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-data-backend, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generate Mercado Libre search URLs (their API now requires OAuth)
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!await authenticatedClient(req)) return new Response(JSON.stringify({ error: 'Iniciá sesión para usar esta función.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { query, priceRange, freeShipping } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the ML search URL
    let searchPath = query.replace(/ /g, '-');
    let url = `https://listado.mercadolibre.com.ar/${encodeURIComponent(searchPath)}`;

    const params: string[] = [];
    if (priceRange) {
      const [min, max] = priceRange.split("-");
      params.push(max === "*" ? `_PriceRange_${min}-0` : `_PriceRange_${min}-${max}`);
    }
    if (freeShipping) {
      params.push("_Frete_Gr%C3%A1tis");
    }
    params.push("_Condition_new");

    url += params.join("");

    return new Response(
      JSON.stringify({ searchUrl: url, query }),
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
