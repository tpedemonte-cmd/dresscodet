export type ItemUsageStatus = 'frecuente' | 'poco usada' | 'olvidada';

export type ItemUsage = {
  prenda: string;
  itemId: string;
  imageUrl: string;
  category: string;
  usos: number;
  ultimaVez: string;
  estado: ItemUsageStatus;
};

type HistoryEntry = {
  recommended_item_ids: string[] | null;
  created_at: string;
};

type ClothingItem = {
  id: string;
  name: string;
  image_url: string;
  category: string;
};

export function analizarUsoPrendas(
  historial: HistoryEntry[],
  prendas: ClothingItem[],
  diasOlvidada = 30,
  umbralFrecuente = 5
): ItemUsage[] {
  const usageMap: Record<string, { count: number; lastUsed: string }> = {};

  historial.forEach((entry) => {
    (entry.recommended_item_ids || []).forEach((id) => {
      if (!usageMap[id]) {
        usageMap[id] = { count: 0, lastUsed: entry.created_at };
      }
      usageMap[id].count++;
      if (entry.created_at > usageMap[id].lastUsed) {
        usageMap[id].lastUsed = entry.created_at;
      }
    });
  });

  const now = new Date();
  const cutoff = new Date(now.getTime() - diasOlvidada * 24 * 60 * 60 * 1000);

  return prendas.map((item) => {
    const usage = usageMap[item.id];
    const usos = usage?.count ?? 0;
    const ultimaVez = usage?.lastUsed ?? '';

    let estado: ItemUsageStatus;
    if (usos === 0 || (ultimaVez && new Date(ultimaVez) < cutoff)) {
      estado = 'olvidada';
    } else if (usos >= umbralFrecuente) {
      estado = 'frecuente';
    } else {
      estado = 'poco usada';
    }

    return {
      prenda: item.name,
      itemId: item.id,
      imageUrl: item.image_url,
      category: item.category,
      usos,
      ultimaVez: ultimaVez ? ultimaVez.split('T')[0] : '—',
      estado,
    };
  });
}
