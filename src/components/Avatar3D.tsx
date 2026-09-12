import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

export type Avatar3DConfig = {
  height: number;
  build: number; // 0 = delgado, 100 = robusto
  skinTone: number; // índice en SKIN_SWATCHES
  gender: 'femenino' | 'masculino';
};

export const SKIN_SWATCHES = [
  { label: 'Muy clara', color: '#f3d5c0' },
  { label: 'Clara', color: '#e8b894' },
  { label: 'Media', color: '#c68863' },
  { label: 'Morena', color: '#9c6144' },
  { label: 'Oscura', color: '#6b4231' },
  { label: 'Muy oscura', color: '#432f26' },
];

export const DEFAULT_AVATAR_3D: Avatar3DConfig = {
  height: 170,
  build: 45,
  skinTone: 1,
  gender: 'femenino',
};

/** Zonas del cuerpo (en % del alto/ancho del visor) donde se apoya cada tipo de prenda */
const ZONES: Record<string, { top: number; height: number; width: number }> = {
  cabeza: { top: 3, height: 10, width: 20 },
  torso: { top: 12, height: 33, width: 42 },
  piernas: { top: 45, height: 44, width: 32 },
  cuerpo: { top: 12, height: 76, width: 42 },
  pies: { top: 85, height: 11, width: 30 },
  mano: { top: 40, height: 14, width: 20 },
};

/** Difumina los bordes de la foto para que el fondo del placard no se note como recuadro */
const FEATHER =
  'radial-gradient(ellipse 68% 72% at 50% 50%, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)';

const CATEGORY_ZONE: Record<string, keyof typeof ZONES> = {
  remera: 'torso',
  camisa: 'torso',
  buzo: 'torso',
  campera: 'torso',
  pantalon: 'piernas',
  short: 'piernas',
  pollera: 'piernas',
  vestido: 'cuerpo',
  zapatillas: 'pies',
  zapatos: 'pies',
  medias: 'pies',
  accesorio: 'mano',
  otro: 'mano',
};

/** Orden de apilado: lo que va por encima tiene z mayor */
const ZONE_Z: Record<string, number> = {
  cuerpo: 10,
  piernas: 11,
  torso: 12,
  pies: 13,
  cabeza: 14,
  mano: 15,
};

function Body({ config }: { config: Avatar3DConfig }) {
  const skin = SKIN_SWATCHES[config.skinTone]?.color ?? SKIN_SWATCHES[1].color;
  const isFem = config.gender === 'femenino';

  // Escala general por altura y grosor por contextura
  const scale = config.height / 170;
  const w = 0.85 + (config.build / 100) * 0.5; // 0.85 → 1.35
  const shoulder = (isFem ? 0.19 : 0.23) * w;
  const hip = (isFem ? 0.2 : 0.17) * w;
  const limb = 0.055 * (0.8 + w * 0.3);

  const mat = useMemo(
    () => ({ color: skin, roughness: 0.62, metalness: 0.03 }),
    [skin]
  );

  return (
    <group scale={scale} position={[0, -0.82, 0]}>
      {/* Cabeza y cuello */}
      <mesh position={[0, 1.66, 0]} castShadow>
        <sphereGeometry args={[0.105, 40, 32]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, 1.53, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.055, 0.1, 24]} />
        <meshStandardMaterial {...mat} />
      </mesh>

      {/* Torso (pecho → cintura) */}
      <mesh position={[0, 1.26, 0]} scale={[shoulder / 0.16, 1, 0.62]} castShadow>
        <capsuleGeometry args={[0.16, 0.3, 16, 32]} />
        <meshStandardMaterial {...mat} />
      </mesh>

      {/* Cadera */}
      <mesh position={[0, 1.0, 0]} scale={[hip / 0.15, 1, 0.66]} castShadow>
        <capsuleGeometry args={[0.15, 0.12, 16, 32]} />
        <meshStandardMaterial {...mat} />
      </mesh>

      {/* Brazos */}
      {[-1, 1].map((s) => (
        <group key={`arm${s}`}>
          <mesh
            position={[s * (shoulder + 0.03), 1.3, 0]}
            rotation={[0, 0, s * 0.14]}
            castShadow
          >
            <capsuleGeometry args={[limb, 0.26, 12, 20]} />
            <meshStandardMaterial {...mat} />
          </mesh>
          <mesh
            position={[s * (shoulder + 0.08), 1.0, 0]}
            rotation={[0, 0, s * 0.08]}
            castShadow
          >
            <capsuleGeometry args={[limb * 0.88, 0.26, 12, 20]} />
            <meshStandardMaterial {...mat} />
          </mesh>
          <mesh position={[s * (shoulder + 0.11), 0.83, 0]} castShadow>
            <sphereGeometry args={[limb * 0.95, 20, 16]} />
            <meshStandardMaterial {...mat} />
          </mesh>
        </group>
      ))}

      {/* Piernas */}
      {[-1, 1].map((s) => (
        <group key={`leg${s}`}>
          <mesh position={[s * hip * 0.5, 0.68, 0]} castShadow>
            <capsuleGeometry args={[limb * 1.5, 0.3, 12, 20]} />
            <meshStandardMaterial {...mat} />
          </mesh>
          <mesh position={[s * hip * 0.5, 0.28, 0]} castShadow>
            <capsuleGeometry args={[limb * 1.15, 0.3, 12, 20]} />
            <meshStandardMaterial {...mat} />
          </mesh>
          <mesh position={[s * hip * 0.5, 0.04, 0.05]} castShadow>
            <boxGeometry args={[limb * 2.2, 0.07, 0.22]} />
            <meshStandardMaterial {...mat} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  image_url: string;
};

export default function Avatar3D({
  config,
  onChange,
  items,
}: {
  config: Avatar3DConfig;
  onChange: (next: Avatar3DConfig) => void;
  items: ClothingItem[];
}) {
  const [cutout, setCutout] = useState(true);
  const [opacity, setOpacity] = useState(90);

  const set = <K extends keyof Avatar3DConfig>(key: K, value: Avatar3DConfig[K]) =>
    onChange({ ...config, [key]: value });

  // Una prenda por zona: la última elegida gana
  const layers = useMemo(() => {
    const byZone = new Map<string, ClothingItem>();
    items.forEach((item) => {
      const zone = CATEGORY_ZONE[item.category] ?? 'mano';
      byZone.set(zone, item);
    });
    return Array.from(byZone.entries());
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Visor */}
      <div className="relative w-full max-w-sm mx-auto aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-b from-secondary to-background shadow-card">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 0.05, 3.7], fov: 30 }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
        >
          <ambientLight intensity={0.65} />
          <directionalLight position={[2.5, 4, 3]} intensity={1.5} castShadow />
          <directionalLight position={[-3, 2, -2]} intensity={0.4} />
          <Environment preset="city" />
          <Body config={config} />
          <ContactShadows
            position={[0, -0.82, 0]}
            opacity={0.35}
            scale={4}
            blur={2.4}
            far={2}
          />
          <OrbitControls
            enablePan={false}
            minDistance={1.8}
            maxDistance={5}
            minPolarAngle={Math.PI / 3.4}
            maxPolarAngle={Math.PI / 1.9}
          />
        </Canvas>

        {/* Prendas como capas 2D sobre el modelo */}
        <div className="pointer-events-none absolute inset-0">
          {layers.map(([zone, item]) => {
            const z = ZONES[zone];
            return (
              <img
                key={item.id}
                src={item.image_url}
                alt={item.name}
                className={`absolute left-1/2 -translate-x-1/2 object-contain drop-shadow-md ${
                  cutout ? 'mix-blend-multiply' : ''
                }`}
                style={{
                  top: `${z.top}%`,
                  height: `${z.height}%`,
                  width: `${z.width}%`,
                  opacity: opacity / 100,
                  zIndex: ZONE_Z[zone] ?? 10,
                }}
              />
            );
          })}
        </div>

        <div className="absolute bottom-2 left-2 rounded-full bg-background/80 backdrop-blur-sm px-2 py-1 text-[11px] font-body text-muted-foreground">
          Arrastrá para girar
        </div>
      </div>

      {/* Controles */}
      <div className="max-w-sm mx-auto space-y-4 rounded-xl bg-secondary/50 p-4">
        <div className="grid grid-cols-2 gap-2">
          {(['femenino', 'masculino'] as const).map((g) => (
            <button
              key={g}
              onClick={() => set('gender', g)}
              className={`rounded-lg px-3 py-2 text-xs font-body font-medium capitalize transition-colors ${
                config.gender === g
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-body">
            <span className="text-foreground">Altura</span>
            <span className="text-muted-foreground">{config.height} cm</span>
          </div>
          <Slider
            value={[config.height]}
            min={140}
            max={205}
            step={1}
            onValueChange={([v]) => set('height', v)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-body">
            <span className="text-foreground">Contextura</span>
            <span className="text-muted-foreground">
              {config.build < 30 ? 'Delgada' : config.build < 60 ? 'Promedio' : config.build < 80 ? 'Robusta' : 'Corpulenta'}
            </span>
          </div>
          <Slider
            value={[config.build]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => set('build', v)}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-body text-foreground">Tono de piel</p>
          <div className="flex flex-wrap gap-2">
            {SKIN_SWATCHES.map((s, i) => (
              <button
                key={s.label}
                title={s.label}
                onClick={() => set('skinTone', i)}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${
                  config.skinTone === i ? 'border-primary scale-110' : 'border-border'
                }`}
                style={{ backgroundColor: s.color }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex justify-between text-xs font-body">
            <span className="text-foreground">Visibilidad de las prendas</span>
            <span className="text-muted-foreground">{opacity}%</span>
          </div>
          <Slider
            value={[opacity]}
            min={30}
            max={100}
            step={5}
            onValueChange={([v]) => setOpacity(v)}
          />
          <label className="flex items-center gap-2 text-xs font-body text-muted-foreground">
            <input
              type="checkbox"
              checked={cutout}
              onChange={(e) => setCutout(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Disimular el fondo blanco de las fotos
          </label>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => onChange(DEFAULT_AVATAR_3D)}
        >
          <RotateCcw className="h-4 w-4 mr-2" /> Volver a los valores por defecto
        </Button>
      </div>
    </div>
  );
}
