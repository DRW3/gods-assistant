import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAssistantStore } from '../../stores/assistantStore';
import { orbColor } from '../../styles/theme';

function Ring({ index }: { index: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const orbState = useAssistantStore((s) => s.orbState);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const t = clock.getElapsedTime();
    const isActive = orbState === 'listening' || orbState === 'speaking';
    const cycle = ((t * 0.8 + index * 0.4) % 2.0) / 2.0;
    const scale = isActive ? 1.2 + cycle * 1.0 : 1.2;
    const opacity = isActive ? (1.0 - cycle) * 0.4 : 0.05;
    ringRef.current.scale.setScalar(scale);
    const mat = ringRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = opacity;
    mat.color.lerp(new THREE.Color(orbColor(orbState)), 0.05);
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.95, 1.0, 64]} />
      <meshBasicMaterial color="#00F0FF" transparent opacity={0.05} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function Rings() {
  return (
    <>
      <Ring index={0} />
      <Ring index={1} />
      <Ring index={2} />
    </>
  );
}
