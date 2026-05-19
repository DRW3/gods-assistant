import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAssistantStore } from '../../stores/assistantStore';
import { orbColor } from '../../styles/theme';

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
    float pulse = 0.85 + 0.15 * sin(uTime * 2.0);
    float glow = fresnel * pulse * uIntensity;
    vec3 core = uColor * 0.3;
    vec3 rim = uColor * glow;
    vec3 finalColor = core + rim;
    float alpha = 0.4 + glow * 0.6;
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export default function OrbCore() {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const orbState = useAssistantStore((s) => s.orbState);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = clock.getElapsedTime();

    const color = new THREE.Color(orbColor(orbState));
    matRef.current.uniforms.uColor.value.lerp(color, 0.08);

    const targetIntensity = orbState === 'idle' ? 0.6 : orbState === 'error' ? 1.5 : 1.0;
    const current = matRef.current.uniforms.uIntensity.value;
    matRef.current.uniforms.uIntensity.value += (targetIntensity - current) * 0.05;

    if (meshRef.current) {
      const breathe = orbState === 'idle'
        ? 1.0 + 0.03 * Math.sin(clock.getElapsedTime() * 1.5)
        : orbState === 'listening'
          ? 1.0 + 0.06 * Math.sin(clock.getElapsedTime() * 3.0)
          : 1.0;
      meshRef.current.scale.setScalar(breathe);

      // Error shake
      if (orbState === 'error') {
        meshRef.current.position.x = Math.sin(clock.getElapsedTime() * 40) * 0.05;
      } else {
        meshRef.current.position.x *= 0.9;
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        uniforms={{
          uColor: { value: new THREE.Color('#00F0FF') },
          uTime: { value: 0 },
          uIntensity: { value: 0.6 },
        }}
      />
    </mesh>
  );
}
