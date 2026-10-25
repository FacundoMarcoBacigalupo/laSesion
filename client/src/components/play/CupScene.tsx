import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

export default function CupScene({ holding, onStart, onStop }: { holding: boolean; onStart: () => void; onStop: () => void }) {
  return (
    <div style={{ width: 170, height: 170, margin: 'auto' }}>
      <Canvas camera={{ position: [0, 0.4, 2.2], fov: 35 }} dpr={[1, 2]} frameloop="always">
        <ambientLight intensity={0.4} />
        <Cup holding={holding} onStart={onStart} onStop={onStop} />
        <Environment preset="night">
          <Lightformer form="ring" intensity={2} position={[0, 2, 0]} scale={10} />
        </Environment>
        <EffectComposer>
          <Bloom intensity={holding ? 1.5 : 0.4} luminanceThreshold={0.2} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

function Cup({ holding, onStart, onStop }: any) {
  const ref = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (!ref.current) return;
    const targetRotX = holding ? -0.2 : 0;
    const targetRotY = holding ? 0.2 : 0;
    ref.current.rotation.x += (targetRotX - ref.current.rotation.x) * 0.1;
    ref.current.rotation.y += (targetRotY - ref.current.rotation.y) * 0.1;
    if (holding) {
      const t = state.clock.elapsedTime;
      const s = 1 + 0.1 * Math.sin(t * 7.85);
      ref.current.scale.setScalar(s);
    } else {
      ref.current.scale.setScalar(1);
    }
    if (ring.current) {
      ring.current.rotation.z += delta * (holding ? 4.5 : 0.9);
    }
  });
  return (
    <group ref={ref}
      onPointerDown={(e: any) => { (e.target as any).setPointerCapture?.(e.pointerId); onStart(); }}
      onPointerUp={onStop}
      onPointerCancel={onStop}>
      <mesh>
        <cylinderGeometry args={[0.5, 0.35, 1.2, 64]} />
        <meshPhysicalMaterial transmission={1} thickness={0.6} roughness={0.04} ior={1.5} clearcoat={1} attenuationColor="#8b6cff" attenuationDistance={1.2} envMapIntensity={1.2} />
      </mesh>
      <mesh ref={ring}>
        <torusGeometry args={[0.7, 0.03, 16, 64]} />
        <meshStandardMaterial emissive={holding ? '#ff3b5c' : '#8b6cff'} emissiveIntensity={holding ? 2 : 0.5} color="#8b6cff" />
      </mesh>
    </group>
  );
}