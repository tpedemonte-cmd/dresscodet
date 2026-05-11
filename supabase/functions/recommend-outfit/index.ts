import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { wardrobe, wishlist, mood, event, formality, temperature, weather, season, windKmh, rainProbability, isNight } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Sos un estilista personal argentino. El usuario te va a dar su guardarropas (cada prenda tiene un ID interno, y las marcadas con ⭐ FAVORITA son sus prendas preferidas). También puede tener una WISHLIST con productos que le gustan de tiendas online pero que todavía no compró. Estado de ánimo, tipo de evento, temperatura, clima y estación del año. 

Tenés que recomendar un outfit COMPLETO de pies a cabeza usando SOLAMENTE las prendas que tiene en su placard. Esto incluye TODO: ropa interior (calzones/bóxers/bombachas), medias, remera/camisa, pantalón/short/pollera, abrigo si hace falta, calzado y accesorios. PRIORIZÁ las prendas marcadas como FAVORITA siempre que sean apropiadas para la ocasión. Sé específico con qué combinaciones hacer.

Si al usuario le falta CUALQUIER prenda para completar el outfit completo (incluyendo ropa interior, medias, calzado, etc.), agregá esa búsqueda en COMPRAR. No asumas que ya tiene básicos como medias o ropa interior si no figuran en el placard.

IMPORTANTE: En tu respuesta NUNCA muestres los IDs de las prendas. Referite a cada prenda por su NOMBRE (ej: "la remera verde", "la campera negra"). Los IDs son solo para uso interno.

SOBRE LA WISHLIST (REGLA ESTRICTA): Solo mencioná productos de la WISHLIST si son REALMENTE apropiados y específicos para la ocasión, evento, clima y estilo solicitado. Por ejemplo: si va al gimnasio, NO menciones jeans, camisas formales ni nada que no sea ropa deportiva; si va a una salida formal, NO menciones ropa deportiva. Si NINGÚN producto de la wishlist encaja perfecto con esta ocasión específica, NO menciones la wishlist en absoluto, ni siquiera de pasada. Mejor no decir nada que forzar una recomendación que no tiene sentido. Solo recomendá de la wishlist cuando realmente complemente el outfit para ESTA ocasión.

Respondé en español argentino, de manera amigable y con onda. Si no tiene prendas adecuadas, sugerí qué podría agregar. Mantené la respuesta corta y concisa (máximo 3-4 párrafos).

Al final de tu respuesta, agregá TRES líneas separadas con el formato exacto (estas líneas NO se muestran al usuario, son para el sistema):

ITEMS_USADOS: id1, id2, id3
donde los IDs son los de las prendas del placard que recomendaste usar. Si no usaste ninguna, poné ITEMS_USADOS: ninguno

WISHLIST_USADOS: id1, id2, id3
donde los IDs son los de los productos de la WISHLIST que mencionaste o recomendaste para ESTA ocasión específica. Si no mencionaste ninguno (porque ninguno encajaba con la ocasión), poné WISHLIST_USADOS: ninguno. NO incluyas IDs de productos que no mencionaste en el texto.

COMPRAR: término1 | término2 | término3
donde cada término es una búsqueda corta para Mercado Libre de CUALQUIER prenda que le falte al usuario para completar el outfit, incluyendo básicos como ropa interior (calzones/bóxers/bombachas), medias o calzado si no los tiene en el placard (ej: "medias deportivas blancas", "bóxer algodón negro", "campera de cuero negra", "zapatillas blancas casual"). Listá TODO lo que falte, no solo lo "principal". Si realmente no falta nada, poné COMPRAR: nada`;

    let wishlistSection = '';
    if (wishlist && wishlist.trim()) {
      wishlistSection = `\n\nMi wishlist (productos que me gustan pero no compré todavía):\n${wishlist}`;
    }

    const userPrompt = `Mi guardarropas:
${wardrobe}${wishlistSection}

Evento: ${event}
Estilo deseado: ${formality || 'equilibrado'} (casual = relajado/informal, equilibrado = prolijo pero cómodo, formal = elegante/arreglado)
Temperatura: ${temperature}°C
Clima: ${weather}${isNight ? ' (es de noche)' : ''}
Viento: ${windKmh ?? 'N/D'} km/h
Probabilidad de lluvia: ${rainProbability ?? 'N/D'}%
Estación del año: ${season}

¿Qué me recomendás ponerme?`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const recommendation = data.choices?.[0]?.message?.content || "No pude generar una recomendación.";

    return new Response(JSON.stringify({ recommendation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recommend-outfit error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
