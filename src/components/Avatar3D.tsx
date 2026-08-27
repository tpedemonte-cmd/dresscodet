import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';

export interface BodyMeasures {
  height: number;   // cm
  weight: number;   // kg
  gender: string;   // 'femenino' | 'masculino'
  chest?: number;   // cm (opcional)
  waist?: number;   // cm (opcional)
  hips?: number;    // cm (opcional)
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Deriva radios corporales (en metros) a partir de medidas reales o del BMI. */
function useBody(m: BodyMeasures) {
  return useMemo(() => {
    const h = clamp(m.height || 170, 130, 210) / 100;
    const w = clamp(m.weight || 65, 35, 180);
    const female = m.gender !== 'masculino';
    const bmi = w / (h * h);
    // factor de volumen: 1 en BMI 22
    const bulk = clamp(bmi / 22, 0.72, 1.6);

    const circToRadius = (cm?: number) => (cm && cm > 30 ? cm / 100 / (2 * Math.PI) : undefined);

    const chestR = circToRadius(m.chest) ?? (female ? 0.105 : 0.115) * bulk * (h / 1.7);
    const waistR = circToRadius(m.waist) ?? (female ? 0.088 : 0.098) * bulk * (h / 1.7);
    const hipsR = circToRadius(m.hips) ?? (female ? 0.112 : 0.104) * bulk * (h / 1.7);

    const shoulderW = chestR * (female ? 1.85 : 2.15);
    const headR = 0.105 * (h / 1.7);
    const legLen = h * 0.47;
    const torsoLen = h * 0.29;
    const neckLen = h * 0.045;
    const armLen = h * 0.36;

    return {
      h, female, bmi, bulk,
      chestR, waistR, hipsR, shoulderW, headR,
      legLen, torsoLen, neckLen, armLen,
      thighR: hipsR * 0.55,
      calfR: hipsR * 0.36,
      upperArmR: chestR * 0.3,
      foreArmR: chestR * 0.24,
    };
  }, [m.height, m.weight, m.gender, m.chest, m.waist, m.hips]);
}

function Figure({ measures }: { measures: BodyMeasures }) {
  const b = useBody(measures);
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.35;
  });

  const skin = measures.gender === 'masculino' ? '#c98f6b' : '#d9a17c';
  const mat = <meshStandardMaterial color={skin} roughness={0.62} metalness={0.02} />;

  const hipY = b.legLen;
  const torsoCenterY = hipY + b.torsoLen / 2;
  const shoulderY = hipY + b.torsoLen;

  return (
    <group ref={group} position={[0, -b.h / 2 + 0.02, 0]}>
      {/* cabeza */}
      <mesh position={[0, shoulderY + b.neckLen + b.headR, 0]} castShadow>
        <sphereGeometry args={[b.headR, 32, 24]} />
        {mat}
      </mesh>
      {/* cuello */}
      <mesh position={[0, shoulderY + b.neckLen / 2, 0]} castShadow>
        <cylinderGeometry args={[b.headR * 0.42, b.headR * 0.5, b.neckLen, 20]} />
        {mat}
      </mesh>

      {/* torso: pecho -> cintura */}
      <mesh position={[0, shoulderY - b.torsoLen * 0.22, 0]} castShadow>
        <cylinderGeometry args={[b.chestR * 0.95, b.waistR, b.torsoLen * 0.56, 28]} />
        {mat}
      </mesh>
      {/* cintura -> cadera */}
      <mesh position={[0, hipY + b.torsoLen * 0.2, 0]} castShadow>
        <cylinderGeometry args={[b.waistR, b.hipsR, b.torsoLen * 0.44, 28]} />
        {mat}
      </mesh>
      {/* hombros */}
      <mesh position={[0, shoulderY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[b.chestR * 0.55, b.shoulderW - b.chestR, 8, 20]} />
        {mat}
      </mesh>

      {/* brazos y piernas */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh
            position={[s * (b.shoulderW / 2), shoulderY - b.armLen * 0.25, 0]}
            rotation={[0, 0, s * -0.09]}
            castShadow
          >
            <capsuleGeometry args={[b.upperArmR, b.armLen * 0.45, 6, 16]} />
            {mat}
          </mesh>
          <mesh
            position={[s * (b.shoulderW / 2 + 0.03), shoulderY - b.armLen * 0.72, 0]}
            rotation={[0, 0, s * -0.06]}
            castShadow
          >
            <capsuleGeometry args={[b.foreArmR, b.armLen * 0.45, 6, 16]} />
            {mat}
          </mesh>
          <mesh position={[s * b.hipsR * 0.5, hipY - b.legLen * 0.26, 0]} castShadow>
            <capsuleGeometry args={[b.thighR, b.legLen * 0.42, 6, 18]} />
            {mat}
          </mesh>
          <mesh position={[s * b.hipsR * 0.5, hipY - b.legLen * 0.74, 0]} castShadow>
            <capsuleGeometry args={[b.calfR, b.legLen * 0.42, 6, 18]} />
            {mat}
          </mesh>
          <mesh position={[s * b.hipsR * 0.5, 0.025, b.calfR]} castShadow>
            <boxGeometry args={[b.calfR * 1.9, 0.05, b.calfR * 4]} />
            {mat}
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function Avatar3D({ measures, className = '' }: { measures: BodyMeasures; className?: string }) {
  const h = clamp(measures.height || 170, 130, 210) / 100;

  return (
    <div className={`relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-secondary ${className}`}>
      <Canvas shadows camera={{ position: [0, 0.15, h * 2.1], fov: 42 }} dpr={[1, 2]}>
        <color attach="background" args={['#efe7df']} />
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[2.5, 4, 3]}
          intensity={1.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-3, 1.5, -2]} intensity={0.5} color="#bcd0e0" />
        <Suspense fallback={null}>
          <Environment>
            <Lightformer intensity={1.4} position={[0, 4, 1]} scale={[8, 8, 1]} />
            <Lightformer intensity={0.7} color="#a9c4d6" position={[-4, 1, -1]} rotation-y={Math.PI / 2} scale={[12, 2, 1]} />
          </Environment>
          <Figure measures={measures} />
          <ContactShadows position={[0, -h / 2 + 0.02, 0]} opacity={0.35} scale={3} blur={2.4} far={1.5} />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={h} maxDistance={h * 3.4} target={[0, 0.05, 0]} />
      </Canvas>
      <div className="absolute bottom-2 left-2 right-2 text-center text-[10px] font-body text-muted-foreground bg-background/70 backdrop-blur-sm rounded-full py-1 px-2">
        Vista previa aproximada · arrastrá para girar
      </div>
    </div>
  );
}
