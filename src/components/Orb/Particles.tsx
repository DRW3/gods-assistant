import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAssistantStore } from '../../stores/assistantStore';
import { orbColor } from '../../styles/theme';

const PARTICLE_COUNT = 50;

export default function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const orbState = useAssistantStore((s) => s.orbState);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      angle: (i / PARTICLE_COUNT) * Math.PI * 2,
      radius: 1.4 + Math.random() * 0.6,
      speed: 0.2 + Math.random() * 0.3,
      y: (Math.random() - 0.5) * 0.8,
      size: 0.02 + Math.random() * 0.03,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const speedMultiplier =
      orbState === 'processing' ? 3.0 :
      orbState === 'listening' ? 1.5 :
      orbState === 'speaking' ? 2.0 : 1.0;
    const t = clock.getElapsedTime();

    particles.forEach((p, i) => {
      const angle = p.angle + t * p.speed * speedMultiplier;
      const x = Math.cos(angle) * p.radius;
      const z = Math.sin(angle) * p.radius;
      const y = p.y + Math.sin(t * 1.5 + i) * 0.1;
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(p.size * (orbState === 'idle' ? 0.8 : 1.2));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    const targetColor = new THREE.Color(orbColor(orbState));
    mat.color.lerp(targetColor, 0.05);
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#00F0FF" transparent opacity={0.7} />
    </instancedMesh>
  );
}
