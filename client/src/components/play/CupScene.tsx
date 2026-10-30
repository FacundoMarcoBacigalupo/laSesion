import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function CupScene({ holding, onStart, onStop }: { holding: boolean; onStart: () => void; onStop: () => void }) {
  return (
    <div className="cup-scene">
      <Canvas
        camera={{ position: [0.85, 1.35, 4.8], fov: 26 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.28} />
        <directionalLight position={[2.4, 3.2, 1.6]} intensity={2.4} color="#fff4ea" />
        <directionalLight position={[-2.2, 0.6, -1.4]} intensity={0.7} color="#ffb3c0" />
        <pointLight position={[0.1, 0.15, 1.1]} intensity={holding ? 4.2 : 0.35} color="#ff1f3d" distance={3.4} />
        <LookAt />
        <Cup holding={holding} onStart={onStart} onStop={onStop} />
      </Canvas>
    </div>
  );
}

function LookAt() {
  useFrame(({ camera }) => {
    camera.lookAt(0, 0.02, 0);
  });
  return null;
}

function Cup({ holding, onStart, onStop }: { holding: boolean; onStart: () => void; onStop: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const blood = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const tilt = holding ? 0.07 * Math.sin(t * 2.4) : 0.012 * Math.sin(t * 0.7);
    ref.current.rotation.z += (tilt - ref.current.rotation.z) * 0.08;
    ref.current.rotation.y += (holding ? 0.18 : 0.04) * 0.016;
    const pulse = holding ? 1 + 0.025 * Math.sin(t * 7) : 1;
    ref.current.scale.setScalar(pulse);
    if (blood.current) {
      const level = holding ? 0.42 + 0.06 * Math.sin(t * 3) : 0.16;
      blood.current.scale.y += (level - blood.current.scale.y) * 0.08;
      blood.current.position.y = -0.78 + blood.current.scale.y * 0.22;
    }
  });

  return (
    <group
      ref={ref}
      onPointerDown={(e: any) => {
        e.stopPropagation();
        (e.target as any).setPointerCapture?.(e.pointerId);
        onStart();
      }}
      onPointerUp={(e: any) => {
        e.stopPropagation();
        onStop();
      }}
      onPointerCancel={onStop}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.98, 0]}>
        <circleGeometry args={[0.92, 48]} />
        <meshStandardMaterial color="#12080a" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.04, -0.965, 0.02]}>
        <circleGeometry args={[0.5, 40]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.45} />
      </mesh>

      <mesh ref={blood} position={[0, -0.74, 0]} scale={[1, 0.16, 1]}>
        <cylinderGeometry args={[0.4, 0.44, 0.5, 40]} />
        <meshStandardMaterial color="#6a0812" emissive="#4a000c" emissiveIntensity={holding ? 0.9 : 0.25} roughness={0.22} metalness={0.18} />
      </mesh>

      <mesh>
        <cylinderGeometry args={[0.62, 0.48, 1.78, 64, 1, true]} />
        <meshPhysicalMaterial
          color={holding ? '#ffe8ec' : '#f7f3ee'}
          emissive={holding ? '#7a1020' : '#1a0a0e'}
          emissiveIntensity={holding ? 0.28 : 0.04}
          transparent
          opacity={0.16}
          roughness={0.04}
          metalness={0.04}
          clearcoat={1}
          clearcoatRoughness={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh>
        <cylinderGeometry args={[0.54, 0.4, 1.66, 48, 1, true]} />
        <meshStandardMaterial color="#1a090c" transparent opacity={0.22} roughness={0.4} side={THREE.BackSide} />
      </mesh>

      <mesh position={[0, 0.89, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.038, 16, 64]} />
        <meshStandardMaterial color={holding ? '#ffd6dc' : '#f7f1ea'} metalness={0.45} roughness={0.16} />
      </mesh>
      <mesh position={[0, -0.89, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.48, 0.03, 12, 48]} />
        <meshStandardMaterial color={holding ? '#ff8fa0' : '#b7a49c'} metalness={0.25} roughness={0.32} />
      </mesh>
      <mesh position={[0, -0.87, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.46, 40]} />
        <meshStandardMaterial color="#efe4da" transparent opacity={0.34} roughness={0.12} />
      </mesh>

      <mesh position={[0.3, 0.08, 0.28]} rotation={[0, 0.35, 0.04]}>
        <planeGeometry args={[0.07, 1.15]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={holding ? 0.62 : 0.32} />
      </mesh>
    </group>
  );
}
