import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { destination, origin, tripType, month, days, activities, notes } = await req.json();
    if (!destination || typeof destination !== "string") {
      return new Response(JSON.stringify({ error: "Falta el destino" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: items } = await supabase
      .from("clothing_items")
      .select("id,name,category,subcategory,color,availability")
      .eq("user_id", user.id);

    const wardrobe = (items || [])
      .map((i: any) => `${i.name} (${i.category}${i.subcategory ? "/" + i.subcategory : ""}, ${i.color || "sin color"})`)
      .join("\n") || "Placard vacío";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Sos un asesor de imagen argentino especializado en viajes y en códigos de vestimenta culturales y religiosos.

El usuario vive en ${origin || "Argentina"} y viaja a un destino con posibles costumbres, religión, clima y normas de vestimenta distintas. Tenés que decirle, con respeto y sin estereotipos, cómo se viste la gente ahí, qué se espera (especialmente en templos, mezquitas, iglesias, barrios conservadores o zonas rurales), qué NO conviene usar, qué prendas de su placard le sirven y qué prendas concretas le faltan comprar.

Reglas:
- Sé concreto y práctico, en español argentino claro.
- Tené en cuenta clima y estación del mes indicado en ESE destino (puede ser opuesto al de Argentina).
- "cultural_notes": 3 a 6 puntos cortos sobre vestimenta local, normas religiosas y respeto (ej: cubrir hombros y rodillas, pañuelo para la cabeza en mezquitas, calzado fácil de sacar).
- "avoid": 2 a 5 cosas que conviene evitar usar allá.
- "from_wardrobe": prendas que YA tiene y le van a servir, con un motivo corto. Usá los nombres tal cual figuran en el placard. Si el placard está vacío, devolvé lista vacía.
- "to_buy": 3 a 7 prendas o accesorios que necesita incorporar, con motivo cultural/climático y un "search_query" corto y específico para Mercado Libre Argentina (ej: "pañuelo pashmina liso mujer", "pantalón lino suelto hombre").
- No inventes reglas legales inexistentes; si algo depende de la zona, aclaralo.`;

    const userPrompt = `Destino: ${destination}
Mes del viaje: ${month || "no especificado"}
Duración: ${days ? days + " días" : "no especificada"}
Tipo de viaje: ${tripType || "turismo"}
Actividades previstas: ${(activities && activities.length ? activities.join(", ") : "no especificadas")}
Aclaraciones: ${notes || "ninguna"}

MI PLACARD:
${wardrobe}

Decime qué necesito para vestirme bien y con respeto en ese destino.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "travel_wardrobe",
            description: "Guía de vestimenta cultural y compras para un viaje",
            parameters: {
              type: "object",
              properties: {
                destination_summary: { type: "string" },
                cultural_notes: { type: "array", items: { type: "string" } },
                avoid: { type: "array", items: { type: "string" } },
                from_wardrobe: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { item: { type: "string" }, reason: { type: "string" } },
                    required: ["item", "reason"],
                    additionalProperties: false,
                  },
                },
                to_buy: {
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
              required: ["destination_summary", "cultural_notes", "avoid", "from_wardrobe", "to_buy"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "travel_wardrobe" } },
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
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let result: any = { destination_summary: "", cultural_notes: [], avoid: [], from_wardrobe: [], to_buy: [] };
    if (args) {
      try { result = JSON.parse(args); } catch { console.error("parse error"); }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("travel-wardrobe error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
