import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAiConfig } from "../_shared/ai.ts";
import { authenticatedClient } from "../_shared/backend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-data-backend, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authenticated = await authenticatedClient(req);
    if (!authenticated) return new Response(JSON.stringify({ error: 'Iniciá sesión para usar esta función.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { client: supabase, user } = authenticated;

    // Fetch user data in parallel
    const [itemsRes, looksRes, historyRes, plansRes, wishlistRes] = await Promise.all([
      supabase.from("clothing_items").select("*").eq("user_id", user.id),
      supabase.from("saved_looks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("outfit_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("weekly_plans").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("wishlist").select("*").eq("user_id", user.id),
    ]);

    const items = itemsRes.data || [];
    const looks = looksRes.data || [];
    const history = historyRes.data || [];
    const plans = plansRes.data || [];
    const wishlist = wishlistRes.data || [];

    if (items.length === 0) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ai = getAiConfig("google/gemini-3-flash-preview");

    // Build context about user's style
    const wardrobeSummary = items.map(i =>
      `${i.name} (${i.category}, ${i.color || "sin color"})${i.is_favorite ? " ⭐FAVORITA" : ""}`
    ).join("\n");

    const categories = items.map(i => i.category);
    const categoryCounts: Record<string, number> = {};
    categories.forEach(c => { categoryCounts[c] = (categoryCounts[c] || 0) + 1; });

    const lookNotes = looks.filter(l => l.note).map(l => l.note).join("\n");

    // Combine outfit_history + weekly_plans into a single feedback corpus
    const allOutfits = [
      ...history.map((h: any) => ({ ...h, source: "historial" })),
      ...plans.map((p: any) => ({ ...p, source: "plan", event: p.event, recommendation: p.recommendation || "" })),
    ];

    const lovedOutfits = allOutfits.filter((o: any) =>
      o.is_favorite || o.feedback === "liked" || o.feedback === "used"
    );
    const dislikedOutfits = allOutfits.filter((o: any) =>
      o.feedback === "disliked" || o.feedback === "not_used"
    );

    const lovedContext = lovedOutfits.slice(0, 15).map((o: any) => {
      const tags = [
        o.is_favorite ? "⭐FAVORITO" : "",
        o.feedback === "liked" ? "👍 le gustó" : "",
        o.feedback === "used" ? "✅ lo usó" : "",
      ].filter(Boolean).join(" ");
      return `[${tags}] ${o.event} (${o.weather || "?"}, ${o.temperature ?? "?"}°C) → ${(o.recommendation || "").substring(0, 200)}`;
    }).join("\n");

    const dislikedContext = dislikedOutfits.slice(0, 10).map((o: any) => {
      const tag = o.feedback === "disliked" ? "👎 no le gustó" : "❌ no lo usaría";
      return `[${tag}] ${o.event} → ${(o.recommendation || "").substring(0, 150)}`;
    }).join("\n");

    // Track which items are used most across loved outfits (highest signal)
    const itemUsage: Record<string, number> = {};
    lovedOutfits.forEach((o: any) => {
      (o.recommended_item_ids || []).forEach((id: string) => {
        itemUsage[id] = (itemUsage[id] || 0) + 2; // weight loved more
      });
    });
    allOutfits.forEach((o: any) => {
      (o.recommended_item_ids || []).forEach((id: string) => {
        itemUsage[id] = (itemUsage[id] || 0) + 1;
      });
    });

    const mostUsedItems = Object.entries(itemUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id]) => items.find(i => i.id === id))
      .filter(Boolean)
      .map(i => `${i!.name} (${i!.category})`)
      .join(", ");

    const wishlistContext = wishlist.length > 0
      ? wishlist.map(w => `${w.title} ($${w.price})`).join("\n")
      : "No tiene wishlist";

    const systemPrompt = `Sos un personal shopper argentino experto en moda. Analizás el estilo de un usuario basándote en su guardarropas, su historial de outfits y, sobre todo, en el FEEDBACK explícito que dejó (favoritos, "me gustó", "lo usé", "no me gustó", "no lo usaría") para entender realmente qué onda le va.

Tu objetivo:
1. Describir CON ONDA el estilo del usuario (vibe, estética, paleta, vibe social) en 2-3 oraciones cálidas y específicas, no genéricas.
2. Recomendar 3-5 prendas o accesorios que NO tiene pero que le encantarían según ese estilo y los outfits que más le gustaron.

Responde EXCLUSIVAMENTE en formato JSON válido con esta estructura:
{
  "style_profile": "descripción de la onda/estilo del usuario en 2-3 oraciones, específica y con personalidad",
  "recommendations": [
    {
      "item": "nombre descriptivo de la prenda",
      "reason": "por qué le queda bien según los outfits que le gustaron y su estilo, max 2 oraciones",
      "search_query": "término de búsqueda para Mercado Libre Argentina, específico y corto"
    }
  ]
}

Reglas:
- Priorizá los outfits marcados como FAVORITOS, "lo usó" o "le gustó" para entender qué le funciona.
- EVITÁ recomendar cosas parecidas a los outfits con feedback negativo ("no me gustó", "no lo usaría").
- NO recomiendes cosas que ya tiene (revisá bien el guardarropas).
- Basate en colores, categorías y combinaciones que aparecen en sus outfits favoritos.
- Los search_query deben ser específicos: "cinturón cuero marrón hombre" no "cinturón".
- Máximo 5 recomendaciones.
- Hablá en argentino casual, sin clichés.`;

    const userPrompt = `GUARDARROPAS:
${wardrobeSummary}

DISTRIBUCIÓN POR CATEGORÍA:
${Object.entries(categoryCounts).map(([k, v]) => `${k}: ${v}`).join(", ")}

PRENDAS MÁS USADAS EN OUTFITS QUE LE GUSTARON:
${mostUsedItems || "Sin datos aún"}

OUTFITS QUE LE ENCANTARON (favoritos / le gustaron / los usó):
${lovedContext || "Todavía no marcó favoritos ni dejó feedback positivo"}

OUTFITS QUE NO LE GUSTARON (evitar este tipo de propuestas):
${dislikedContext || "Sin feedback negativo"}

NOTAS DE LOOKS GUARDADOS:
${lookNotes || "Sin notas"}

WISHLIST (cosas que le gustan):
${wishlistContext}

Analizá todo (priorizando el feedback explícito y los favoritos) y devolveme la onda de su estilo + prendas nuevas que le encantarían.`;


    const response = await fetch(ai.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ai.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "style_recommendations",
            description: "Return personalized style recommendations",
            parameters: {
              type: "object",
              properties: {
                style_profile: { type: "string" },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      item: { type: "string" },
                      reason: { type: "string" },
                      search_query: { type: "string" },
                    },
                    required: ["item", "reason", "search_query"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["style_profile", "recommendations"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "style_recommendations" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let result = { style_profile: "", recommendations: [] };
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("style-recommendations error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
