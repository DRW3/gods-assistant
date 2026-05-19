import { useRef, useEffect } from 'react';
import { useAssistantStore } from '../stores/assistantStore';
import { orbColor } from '../styles/theme';

export default function Waveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformData = useAssistantStore((s) => s.waveformData);
  const orbState = useAssistantStore((s) => s.orbState);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 70;

    ctx.clearRect(0, 0, width, height);

    if (orbState !== 'listening') return;

    const color = orbColor(orbState);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();

    const sliceAngle = (Math.PI * 2) / waveformData.length;
    for (let i = 0; i < waveformData.length; i++) {
      const amplitude = waveformData[i] * 30;
      const r = radius + amplitude;
      const angle = i * sliceAngle - Math.PI / 2;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.stroke();
  }, [waveformData, orbState]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }}
    />
  );
}
