import { Canvas } from '@react-three/fiber';
import OrbCore from './OrbCore';
import Particles from './Particles';
import Rings from './Rings';

export default function OrbScene() {
  return (
    <div style={{ width: '200px', height: '200px', margin: '0 auto' }}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <OrbCore />
        <Particles />
        <Rings />
      </Canvas>
    </div>
  );
}
