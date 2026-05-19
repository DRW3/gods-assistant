import { useMemo } from 'react';
import { useAssistantStore } from '../stores/assistantStore';
import { palette, fonts } from '../styles/theme';

const BAR_COUNT = 24;

export default function WaveformBar() {
  const orbState = useAssistantStore((s) => s.orbState);
  const waveformData = useAssistantStore((s) => s.waveformData);

  const isActive = orbState === 'listening' || orbState === 'speaking';
  const isProcessing = orbState === 'processing';

  const barColor = orbState === 'idle' ? palette.white08
    : orbState === 'processing' ? `${palette.gold}60`
    : orbState === 'speaking' ? '#b49cdb'
    : palette.jade;

  const bars = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      if (isActive) {
        const idx = Math.floor((i / BAR_COUNT) * waveformData.length);
        return Math.max(2, Math.abs(waveformData[idx] || 0) * 60);
      }
      if (isProcessing) return 4 + Math.sin(i * 0.8) * 4;
      return 2;
    });
  }, [isActive, isProcessing, waveformData]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '8px 20px', gap: 8,
      borderBottom: `1px solid ${palette.white04}`,
      background: isActive ? `${palette.jade}08` : 'transparent',
      transition: 'background 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, height: 24 }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            width: 2.5, height: isActive ? h : 2, borderRadius: 2,
            background: barColor,
            transition: orbState === 'idle' ? 'height 0.3s, background 0.3s' : 'none',
          }} />
        ))}
      </div>
      <div style={{ fontFamily: fonts.mono, fontSize: 9, color: palette.textMuted, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <span style={{
          padding: '2px 8px', borderRadius: 6, fontSize: 9,
          background: orbState === 'listening' ? `${palette.jade}18` : palette.white04,
          border: `1px solid ${orbState === 'listening' ? `${palette.jade}30` : palette.white08}`,
          color: orbState === 'listening' ? palette.jade : palette.textMuted,
          transition: 'all 0.2s',
        }}>SPACE</span>
        <span>{orbState === 'listening' ? 'stop' : 'speak'}</span>
      </div>
    </div>
  );
}
