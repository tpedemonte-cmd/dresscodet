export type HistoryOutfit = {
  id: string;
  temperature: number;
  weather: string;
  event: string;
  recommendation: string;
  recommended_item_ids: string[] | null;
  mood: string;
  season: string;
  created_at: string;
};

export type ScoredOutfit = HistoryOutfit & { score: number };

export function calcularSimilitud(
  outfit: HistoryOutfit,
  temperaturaActual: number,
  climaActual: string,
  ocasionActual: string
): number {
  let score = 0;

  // Cercanía de temperatura
  const diffTemp = Math.abs(outfit.temperature - temperaturaActual);
  if (diffTemp <= 3) score += 1;
  else if (diffTemp <= 7) score += 0.5;

  // Coincidencia de clima
  if (outfit.weather === climaActual) score += 2;

  // Coincidencia de ocasión
  if (outfit.event === ocasionActual) score += 3;

  return score;
}

export function recomendarPorHistorial(
  historial: HistoryOutfit[],
  temperaturaActual: number,
  climaActual: string,
  ocasionActual: string
): ScoredOutfit[] {
  return historial
    .map((outfit) => ({
      ...outfit,
      score: calcularSimilitud(outfit, temperaturaActual, climaActual, ocasionActual),
    }))
    .filter((o) => o.score > 0)
    .sort((a, b) => b.score - a.score);
}
