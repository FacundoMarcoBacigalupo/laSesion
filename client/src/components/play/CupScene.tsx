import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function CupScene({ holding, onStart, onStop }: { holding: boolean; onStart: () => void; onStop: () => void }) {
  return (
    <div style={{ width: 220, height: 220, margin: 'auto', touchAction: 'none' }}>
      <Canvas
        camera={{ position: [0, 2.6, 2.0], fov: 38 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 5, 2]} intensity={2.0} color="#ffffff" />
        <pointLight position={[-2, 3, -1]} intensity={1.5} color="#8b6cff" />
        <pointLight position={[0, -0.5, 0]} intensity={holding ? 2.5 : 0.8} color={holding ? '#ff3b5c' : '#8b6cff'} />
        <Cup holding={holding} onStart={onStart} onStop={onStop} />
      </Canvas>
    </div>
  );
}

function Cup({ holding, onStart, onStop }: { holding: boolean; onStart: () => void; onStop: () => void }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    
    // Suave inclinación y flotación al sostener
    const targetTilt = holding ? 0.08 * Math.sin(t * 3) : 0;
    ref.current.rotation.z += (targetTilt - ref.current.rotation.z) * 0.1;

    // Latido y vibración cuando se sostiene
    if (holding) {
      const pulse = 1 + 0.07 * Math.sin(t * 8);
      ref.current.scale.set(pulse, pulse, pulse);
    } else {
      ref.current.scale.set(1, 1, 1);
    }
  });

  return (
    <group
      ref={ref}
      position={[0, -0.2, 0]}
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
      {/* Cuerpo cónico del vaso invertido (ouija style) visto desde arriba */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.55, 0.4, 0.9, 48, 1, true]} />
        <meshPhysicalMaterial
          color={holding ? '#ffb3c0' : '#efeaf7'}
          emissive={holding ? '#ff3b5c' : '#8b6cff'}
          emissiveIntensity={holding ? 0.6 : 0.15}
          transmission={0.92}
          opacity={0.85}
          transparent={true}
          roughness={0.1}
          metalness={0.1}
          ior={1.48}
          thickness={0.5}
          specularIntensity={1.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Base / fondo del vaso cerrado */}
      <mesh position={[0, 0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 48]} />
        <meshPhysicalMaterial
          color={holding ? '#ffb3c0' : '#ffffff'}
          emissive={holding ? '#ff3b5c' : '#8b6cff'}
          emissiveIntensity={holding ? 0.8 : 0.25}
          transmission={0.85}
          opacity={0.9}
          transparent={true}
          roughness={0.08}
          ior={1.48}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Borde sutil del fondo para mayor definición 3D */}
      <mesh position={[0, 0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.025, 16, 48]} />
        <meshStandardMaterial
          color={holding ? '#ff3b5c' : '#c3b1e1'}
          roughness={0.15}
          metalness={0.4}
        />
      </mesh>

      {/* Borde inferior de la boca del vaso que apoya sobre la mesa */}
      <mesh position={[0, -0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.02, 16, 48]} />
        <meshStandardMaterial
          color={holding ? '#ff3b5c' : '#7b61d6'}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>

      {/* Sombra de apoyo en la mesa */}
      <mesh position={[0, -0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.65, 32]} />
        <meshBasicMaterial color="#000000" opacity={0.45} transparent={true} />
      </mesh>
    </group>
  );
}
