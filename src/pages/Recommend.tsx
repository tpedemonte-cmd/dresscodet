import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const MOODS = [
  { value: 'feliz', label: '😊 Feliz' },
  { value: 'relajado', label: '😌 Relajado/a' },
  { value: 'elegante', label: '✨ Elegante' },
  { value: 'casual', label: '😎 Casual' },
  { value: 'energetico', label: '⚡ Energético/a' },
  { value: 'romantico', label: '💕 Romántico/a' },
];

const EVENTS = [
  { value: 'trabajo', label: '💼 Trabajo' },
  { value: 'cita', label: '❤️ Cita' },
  { value: 'amigos', label: '🍻 Juntada con amigos' },
  { value: 'familia', label: '👨‍👩‍👧 Familia' },
  { value: 'fiesta', label: '🎉 Fiesta' },
  { value: 'gym', label: '🏋️ Gym / Deporte' },
  { value: 'casual', label: '🏠 Día casual' },
  { value: 'universidad', label: '📚 Universidad' },
];

const WEATHER = [
  { value: 'soleado', label: '☀️ Soleado' },
  { value: 'nublado', label: '☁️ Nublado' },
  { value: 'lluvia', label: '🌧️ Llueve' },
  { value: 'tormenta', label: '⛈️ Tormenta' },
];

const SEASONS = [
  { value: 'verano', label: '🌞 Verano' },
  { value: 'otoño', label: '🍂 Otoño' },
  { value: 'invierno', label: '❄️ Invierno' },
  { value: 'primavera', label: '🌸 Primavera' },
];

export default function Recommend() {
  const { user } = useAuth();
  const [mood, setMood] = useState('');
  const [event, setEvent] = useState('');
  const [temperature, setTemperature] = useState([20]);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ['clothing_items', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clothing_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleRecommend = async () => {
    if (!mood || !event) {
      toast.error('Completá todos los campos');
      return;
    }
    if (items.length === 0) {
      toast.error('Primero agregá prendas a tu placard');
      return;
    }

    setLoading(true);
    setRecommendation(null);

    try {
      const wardrobeSummary = items.map(i => 
        `${i.name} (${i.category}${i.color ? ', ' + i.color : ''})`
      ).join('; ');

      const { data, error } = await supabase.functions.invoke('recommend-outfit', {
        body: {
          wardrobe: wardrobeSummary,
          mood,
          event,
          temperature: temperature[0],
        },
      });

      if (error) throw error;
      setRecommendation(data.recommendation);
    } catch (err: any) {
      if (err?.message?.includes('429') || err?.status === 429) {
        toast.error('Demasiadas solicitudes, intentá de nuevo en un momento');
      } else if (err?.message?.includes('402') || err?.status === 402) {
        toast.error('Créditos agotados. Agregá fondos en Configuración.');
      } else {
        toast.error('Error al generar la recomendación');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">¿Qué me pongo?</h2>
        <p className="text-muted-foreground font-body">Contanos cómo te sentís y a dónde vas</p>
      </div>

      <div className="space-y-5 bg-card p-6 rounded-xl shadow-card">
        <div className="space-y-2">
          <label className="text-sm font-body font-medium text-foreground">Estado de ánimo</label>
          <Select value={mood} onValueChange={setMood}>
            <SelectTrigger>
              <SelectValue placeholder="¿Cómo te sentís?" />
            </SelectTrigger>
            <SelectContent>
              {MOODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-body font-medium text-foreground">Tipo de juntada</label>
          <Select value={event} onValueChange={setEvent}>
            <SelectTrigger>
              <SelectValue placeholder="¿A dónde vas?" />
            </SelectTrigger>
            <SelectContent>
              {EVENTS.map((e) => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-body font-medium text-foreground">
            Temperatura: {temperature[0]}°C
          </label>
          <Slider
            value={temperature}
            onValueChange={setTemperature}
            min={-5}
            max={45}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground font-body">
            <span>🥶 -5°C</span>
            <span>🔥 45°C</span>
          </div>
        </div>

        <Button
          variant="warm"
          className="w-full"
          disabled={loading || !mood || !event}
          onClick={handleRecommend}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-accent-foreground border-t-transparent rounded-full" />
              Pensando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Recomendame un outfit
            </span>
          )}
        </Button>
      </div>

      {recommendation && (
        <div className="bg-card p-6 rounded-xl shadow-elevated space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Tu outfit recomendado
          </h3>
          <div className="font-body text-foreground whitespace-pre-line leading-relaxed">
            {recommendation}
          </div>
        </div>
      )}
    </div>
  );
}
