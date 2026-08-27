import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';

export interface BodyMeasures {
  height: number;      // cm
  weight: number;      // kg
  gender: string;      // 'femenino' | 'masculino'
  chest?: number;      // circunferencia cm
  waist?: number;      // circunferencia cm
  hips?: number;       // circunferencia cm
  muscle?: number;     // 0..100 contextura
  skinTone?: string;   // hex
  hairColor?: string;  // hex
  hairLength?: number; // 0..100
}

const circToRadius = (c: number) => c / (2 * Math.PI) / 100; // cm -> m

function useBody(m: BodyMeasures) {
  return useMemo(() => {
    const h = Math.min(Math.max(m.height || 170, 130), 210) / 100;
    const w = Math.min(Math.max(m.weight || 65, 35), 160);
    const fem = m.gender !== 'masculino';
    const bmi = w / (h * h);
    const fat = THREE.MathUtils.clamp((bmi - 18) / 16, 0, 1.4);
    const muscle = THREE.MathUtils.clamp((m.muscle ?? 45) / 100, 0, 1);

    // circunferencias por defecto estimadas si el usuario no las ingresa
    const baseChest = (fem ? 84 : 92) + fat * 26 + muscle * 10;
    const baseWaist = (fem ? 68 : 78) + fat * 34 + muscle * 2;
    const baseHips = (fem ? 94 : 92) + fat * 26 + muscle * 3;

    const chestR = circToRadius(m.chest || baseChest);
    const waistR = circToRadius(m.waist || baseWaist);
    const hipsR = circToRadius(m.hips || baseHips);

    const limb = 0.033 + fat * 0.016 + muscle * 0.014;

    return {
      h, fem, fat, muscle,
      chestR, waistR, hipsR,
      shoulderW: chestR * (fem ? 1.5 : 1.72),
      headR: h * 0.0455,
      armR: limb,
      thighR: limb * 1.55 + (fem ? 0.006 : 0),
      calfR: limb * 1.15,
      // alturas anatómicas
      yShoulder: h * 0.815,
      yChest: h * 0.735,
      yWaist: h * 0.625,
      yHips: h * 0.525,
      yCrotch: h * 0.485,
      yKnee: h * 0.275,
      skin: m.skinTone || '#d9a17c',
      hair: m.hairColor || '#3b2418',
      hairLen: THREE.MathUtils.clamp((m.hairLength ?? (fem ? 55 : 12)) / 100, 0, 1),
    };
  }, [m.height, m.weight, m.gender, m.chest, m.waist, m.hips, m.muscle, m.skinTone, m.hairColor, m.hairLength]);
}

/** Torso como superficie de revolución suave (perfil interpolado) */
function Torso({ b }: { b: ReturnType<typeof useBody> }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const key: [number, number][] = [
      [b.yCrotch - 0.02, b.hipsR * 0.82],
      [b.yHips, b.hipsR],
      [(b.yHips + b.yWaist) / 2, (b.hipsR + b.waistR) / 2 * 0.98],
      [b.yWaist, b.waistR],
      [b.yChest, b.chestR],
      [b.yChest + (b.yShoulder - b.yChest) * 0.55, b.chestR * 0.97],
      [b.yShoulder, b.chestR * 0.74],
      [b.yShoulder + 0.03, b.chestR * 0.42],
    ];
    const curve = new THREE.CatmullRomCurve3(key.map(([y, r]) => new THREE.Vector3(r, y, 0)));
    curve.getPoints(48).forEach((p) => pts.push(new THREE.Vector2(Math.max(p.x, 0.01), p.y)));
    const g = new THREE.LatheGeometry(pts, 40);
    g.computeVertexNormals();
    return g;
  }, [b]);

  return (
    <mesh geometry={geo} scale={[1, 1, b.fem ? 0.74 : 0.8]} castShadow receiveShadow>
      <meshStandardMaterial color={b.skin} roughness={0.62} metalness={0} />
    </mesh>
  );
}

function Limb({
  from, to, r1, r2, color,
}: { from: [number, number, number]; to: [number, number, number]; r1: number; r2: number; color: string }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const bb = new THREE.Vector3(...to);
    const dir = new THREE.Vector3().subVectors(bb, a);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { pos: a.clone().add(bb).multiplyScalar(0.5), quat: q, len: dir.length() };
  }, [from, to]);

  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(r2, r1, len, 24, 1, false);
    g.computeVertexNormals();
    return g;
  }, [r1, r2, len]);

  return (
    <group position={pos} quaternion={quat}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.62} />
      </mesh>
      <mesh position={[0, len / 2, 0]} castShadow>
        <sphereGeometry args={[r2, 20, 16]} />
        <meshStandardMaterial color={color} roughness={0.62} />
      </mesh>
      <mesh position={[0, -len / 2, 0]} castShadow>
        <sphereGeometry args={[r1, 20, 16]} />
        <meshStandardMaterial color={color} roughness={0.62} />
      </mesh>
    </group>
  );
}

function Figure({ measures, spin }: { measures: BodyMeasures; spin: boolean }) {
  const b = useBody(measures);
  const g = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (spin && g.current) g.current.rotation.y += delta * 0.4;
  });

  const yHead = b.h - b.headR;
  const armY = b.yShoulder - b.headR * 0.15;
  const handY = b.yWaist - 0.03;
  const elbowX = b.shoulderW * 1.02;

  return (
    <group ref={g} position={[0, -b.h / 2, 0]}>
      <Torso b={b} />

      {/* hombros */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * b.shoulderW * 0.72, armY, 0]} castShadow>
          <sphereGeometry args={[b.armR * 1.55, 24, 18]} />
          <meshStandardMaterial color={b.skin} roughness={0.62} />
        </mesh>
      ))}

      {/* brazos */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Limb
            from={[s * b.shoulderW * 0.72, armY, 0]}
            to={[s * elbowX, b.yWaist + 0.05, 0.01]}
            r1={b.armR * 1.25} r2={b.armR} color={b.skin}
          />
          <Limb
            from={[s * elbowX, b.yWaist + 0.05, 0.01]}
            to={[s * elbowX * 1.05, handY - b.h * 0.09, 0.02]}
            r1={b.armR} r2={b.armR * 0.78} color={b.skin}
          />
        </group>
      ))}

      {/* piernas */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Limb
            from={[s * b.hipsR * 0.45, b.yCrotch, 0]}
            to={[s * b.hipsR * 0.4, b.yKnee, 0]}
            r1={b.thighR * 1.2} r2={b.calfR * 1.05} color={b.skin}
          />
          <Limb
            from={[s * b.hipsR * 0.4, b.yKnee, 0]}
            to={[s * b.hipsR * 0.38, b.h * 0.045, 0]}
            r1={b.calfR} r2={b.calfR * 0.62} color={b.skin}
          />
          {/* pie */}
          <mesh position={[s * b.hipsR * 0.38, b.h * 0.022, b.h * 0.025]} castShadow>
            <boxGeometry args={[b.calfR * 1.5, b.h * 0.026, b.h * 0.085]} />
            <meshStandardMaterial color={b.skin} roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* cuello */}
      <Limb
        from={[0, b.yShoulder - 0.01, 0]}
        to={[0, yHead - b.headR * 0.7, 0]}
        r1={b.headR * 0.52} r2={b.headR * 0.45} color={b.skin}
      />

      {/* cabeza */}
      <mesh position={[0, yHead, 0]} scale={[0.92, 1.12, 1]} castShadow>
        <sphereGeometry args={[b.headR, 40, 32]} />
        <meshStandardMaterial color={b.skin} roughness={0.55} />
      </mesh>

      {/* pelo */}
      <mesh position={[0, yHead + b.headR * 0.08, -b.headR * 0.05]} scale={[0.99, 1.1, 1.03]}>
        <sphereGeometry args={[b.headR * 1.03, 36, 28, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color={b.hair} roughness={0.85} />
      </mesh>
      {b.hairLen > 0.25 && (
        <mesh position={[0, yHead - b.headR * b.hairLen * 1.5, -b.headR * 0.55]}>
          <capsuleGeometry args={[b.headR * 0.78, b.headR * b.hairLen * 2.6, 8, 20]} />
          <meshStandardMaterial color={b.hair} roughness={0.85} />
        </mesh>
      )}
    </group>
  );
}

export default function Avatar3D({
  measures,
  className = '',
}: { measures: BodyMeasures; className?: string }) {
  const [spin, setSpin] = useState(true);
  const h = Math.min(Math.max(measures.height || 170, 130), 210) / 100;

  return (
    <div className={`relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-secondary ${className}`}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0.15, h * 2.1], fov: 32 }}>
        <color attach="background" args={['#efe7df']} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[2.5, 4, 3]} intensity={1.5} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} />
        <Environment>
          <Lightformer intensity={2} position={[0, 4, 2]} scale={[6, 6, 1]} />
          <Lightformer intensity={0.8} color="#cfd8e3" position={[-4, 1, -1]} rotation-y={Math.PI / 2} scale={[10, 4, 1]} />
        </Environment>
        <Figure measures={measures} spin={spin} />
        <ContactShadows position={[0, -h / 2 - 0.001, 0]} opacity={0.45} scale={3} blur={2.4} far={2} />
        <OrbitControls
          enablePan={false}
          minDistance={h * 1.1}
          maxDistance={h * 3.2}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.9}
          onStart={() => setSpin(false)}
        />
      </Canvas>
      <button
        onClick={() => setSpin((s) => !s)}
        className="absolute bottom-2 right-2 text-[11px] font-body px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm text-foreground border border-border"
      >
        {spin ? 'Pausar giro' : 'Girar'}
      </button>
    </div>
  );
}
