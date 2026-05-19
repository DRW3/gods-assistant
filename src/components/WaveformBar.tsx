import { useMemo } from 'react';
import { useAssistantStore } from '../stores/assistantStore';
import { stateColors, fonts } from '../styles/theme';

const BAR_COUNT = 24;

export default function WaveformBar() {
  const orbState = useAssistantStore((s) => s.orbState);
  const waveformData = useAssistantStore((s) => s.waveformData);
  const sc = stateColors(orbState);

  const isActive = orbState === 'listening' || orbState === 'speaking';
  const isProcessing = orbState === 'processing';

  const bars = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      if (isActive) {
        const dataIndex = Math.floor((i / BAR_COUNT) * waveformData.length);
        const amplitude = Math.abs(waveformData[dataIndex] || 0);
        return Math.max(2, amplitude * 60);
      }
      if (isProcessing) {
        return 4 + Math.sin(i * 0.8) * 6;
      }
      return 2;
    });
  }, [isActive, isProcessing, waveformData]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '8px 16px', gap: 8,
      borderBottom: '1px solid rgba(255,255,255,0.03)',
      background: isActive ? `${sc.accent}08` : 'transparent',
      transition: 'background 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, height: 24 }}>
        {bars.map((height, i) => (
          <div key={i} style={{
            width: 2.5,
            height: isActive ? height : 2,
            borderRadius: 2,
            background: orbState === 'idle' ? 'rgba(255,255,255,0.08)'
              : isProcessing ? `${sc.bar}80`
              : sc.bar,
            opacity: isActive ? 0.5 + Math.random() * 0.5 : 1,
            transition: orbState === 'idle' ? 'height 0.3s, background 0.3s' : 'none',
          }} />
        ))}
      </div>
      <div style={{ fontFamily: fonts.mono, fontSize: 9, color: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 3, padding: '2px 8px', fontSize: 9,
          background: orbState === 'listening' ? `${sc.accent}14` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${orbState === 'listening' ? `${sc.accent}26` : 'rgba(255,255,255,0.06)'}`,
          color: orbState === 'listening' ? sc.accent : 'rgba(255,255,255,0.25)',
          transition: 'all 0.2s',
        }}>SPACE</span>
        <span>{orbState === 'listening' ? 'stop' : 'speak'}</span>
      </div>
    </div>
  );
}
