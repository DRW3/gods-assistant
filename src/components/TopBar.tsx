import { useAssistantStore } from '../stores/assistantStore';
import { stateColors, fonts } from '../styles/theme';

export default function TopBar() {
  const orbState = useAssistantStore((s) => s.orbState);
  const systemStats = useAssistantStore((s) => s.systemStats);
  const sc = stateColors(orbState);

  const statusText = orbState === 'idle' ? 'STANDBY'
    : orbState === 'listening' ? 'LISTENING'
    : orbState === 'processing' ? 'PROCESSING'
    : orbState === 'speaking' ? 'SPEAKING'
    : orbState === 'executing' ? 'EXECUTING'
    : 'ERROR';

  const cpuColor = systemStats.cpu_percent > 80 ? '#ef4444' : systemStats.cpu_percent > 50 ? '#f59e0b' : '#10b981';
  const ramColor = systemStats.ram_gb > 12 ? '#ef4444' : systemStats.ram_gb > 8 ? '#f59e0b' : '#10b981';
  const batColor = systemStats.battery_percent < 20 ? '#ef4444' : systemStats.battery_percent < 40 ? '#f59e0b' : '#10b981';

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${sc.border}` }}>
      {/* Orb */}
      <div style={{ position: 'relative', width: 34, height: 34, flexShrink: 0 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, ${sc.accent}, ${sc.orb} 60%)`,
          boxShadow: `0 0 16px ${sc.glow}, inset 0 0 8px rgba(255,255,255,0.08)`,
        }} />
        {orbState !== 'idle' && (
          <div style={{
            position: 'absolute', inset: -3, borderRadius: '50%',
            border: `1px solid ${sc.text}`,
            animation: 'spin 8s linear infinite',
          }}>
            <div style={{
              position: 'absolute', top: -2, left: '50%',
              width: 4, height: 4, borderRadius: '50%',
              background: sc.accent, boxShadow: `0 0 6px ${sc.accent}`,
            }} />
          </div>
        )}
      </div>

      {/* Title */}
      <div style={{ marginLeft: 12, flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.4 }}>GOD'S ASSISTANT</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
          <div style={{
            width: 4, height: 4, borderRadius: '50%',
            background: orbState === 'idle' ? 'rgba(255,255,255,0.15)' : sc.dot,
            boxShadow: orbState !== 'idle' ? `0 0 4px ${sc.dot}` : 'none',
          }} />
          <span style={{ fontFamily: fonts.mono, fontSize: 9, color: sc.text }}>{statusText}</span>
        </div>
      </div>

      {/* System stats */}
      <div style={{ display: 'flex', gap: 8, fontFamily: fonts.mono, fontSize: 8 }}>
        {[
          { label: 'CPU', value: `${systemStats.cpu_percent}%`, color: orbState === 'idle' ? 'rgba(255,255,255,0.1)' : cpuColor },
          { label: 'RAM', value: `${systemStats.ram_gb}G`, color: orbState === 'idle' ? 'rgba(255,255,255,0.1)' : ramColor },
          { label: 'BAT', value: systemStats.battery_percent >= 0 ? `${systemStats.battery_percent}%` : '\u2014', color: orbState === 'idle' ? 'rgba(255,255,255,0.1)' : batColor },
        ].map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: s.color, boxShadow: `0 0 2px ${s.color}` }} />
            <span style={{ color: 'rgba(255,255,255,0.18)' }}>{s.label}</span>
            <span style={{ color: orbState === 'idle' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.45)' }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
