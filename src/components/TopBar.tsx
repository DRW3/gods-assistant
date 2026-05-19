import { useMemo } from 'react';
import { useAssistantStore } from '../stores/assistantStore';
import { palette, clay, fonts, orbGradient, orbGlow, type OrbState } from '../styles/theme';

const GREETINGS = [
  "At your service", "Ready when you are", "What's the mission?",
  "Command me", "Your move", "Awaiting orders",
  "What shall we conquer?", "The throne is yours",
  "Speak and it shall be done", "I'm listening",
  "What needs doing?", "All systems go",
  "Point me at something", "Say the word",
  "Standing by", "What's on your mind?",
  "Let's make something happen", "Fire away",
  "The world awaits", "Ready to roll",
];

export default function TopBar() {
  const orbState = useAssistantStore((s) => s.orbState);
  const stats = useAssistantStore((s) => s.systemStats);

  const greeting = useMemo(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)], []);

  const statusLabel: Record<OrbState, string> = {
    idle: greeting, listening: 'LISTENING', processing: 'THINKING',
    speaking: 'SPEAKING', executing: 'EXECUTING', error: 'ERROR',
  };

  const isActive = orbState !== 'idle';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 12,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
      borderBottom: `1px solid ${palette.white04}`,
    }}>
      <div style={{ position: 'relative', width: 34, height: 34, flexShrink: 0 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: orbGradient(orbState),
          boxShadow: `${clay.orb}, ${orbGlow(orbState)}`,
          transition: 'background 0.4s, box-shadow 0.4s',
        }} />
        {isActive && (
          <div style={{
            position: 'absolute', inset: -4, borderRadius: '50%',
            border: `1.5px solid ${palette.jade}30`,
            animation: 'spin 8s linear infinite',
          }}>
            <div style={{
              position: 'absolute', top: -2, left: '50%',
              width: 5, height: 5, borderRadius: '50%',
              background: palette.jade, boxShadow: `0 0 8px ${palette.jade}`,
            }} />
          </div>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: palette.text, letterSpacing: 0.8 }}>{greeting}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: isActive ? palette.jade : palette.textMuted,
            boxShadow: isActive ? `0 0 6px ${palette.jade}80` : 'none',
            animation: isActive ? 'pulse 2s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontFamily: fonts.mono, fontSize: 9, color: isActive ? `${palette.jade}99` : palette.textMuted }}>
            {statusLabel[orbState]}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, fontFamily: fonts.mono, fontSize: 8 }}>
        {[
          { l: 'CPU', v: `${stats.cpu_percent}%`, c: stats.cpu_percent > 50 ? palette.warning : palette.jade },
          { l: 'BAT', v: stats.battery_percent >= 0 ? `${stats.battery_percent}%` : '—', c: stats.battery_percent < 30 ? palette.danger : palette.jade },
        ].map((s) => (
          <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: isActive ? s.c : palette.textMuted, boxShadow: isActive ? `0 0 3px ${s.c}80` : 'none' }} />
            <span style={{ color: palette.textMuted }}>{s.l}</span>
            <span style={{ color: isActive ? palette.textDim : palette.textMuted }}>{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
