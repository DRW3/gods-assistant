import { useAssistantStore } from '../stores/assistantStore';
import { fonts, colors } from '../styles/theme';

const dotColor = { alive: colors.success, warning: colors.warning, dead: colors.danger, idle: 'rgba(255,255,255,0.12)' };

export default function ProcessesGrid() {
  const processes = useAssistantStore((s) => s.processes);
  const expanded = useAssistantStore((s) => s.expandedSections.processes);
  const toggle = useAssistantStore((s) => s.toggleSection);

  if (processes.length === 0) return null;

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} data-no-drag>
      <div onClick={() => toggle('processes')} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', cursor: 'pointer',
      }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 9, fontWeight: 500, color: 'rgba(255,255,255,0.2)', letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
          {expanded ? '\u25BE' : '\u25B8'} Processes
        </span>
        <span style={{ fontFamily: fonts.mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3, padding: '2px 6px' }}>
          {processes.length} active
        </span>
      </div>
      {expanded && (
        <div style={{ padding: '0 16px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          {processes.map((p) => (
            <div key={p.pid} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
              background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.02)',
              borderRadius: 6, fontFamily: fonts.mono, fontSize: 9,
            }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: dotColor[p.status], boxShadow: `0 0 3px ${dotColor[p.status]}`, flexShrink: 0 }} />
              <span style={{ flex: 1, color: 'rgba(255,255,255,0.45)' }}>{p.name}</span>
              <span style={{ color: 'rgba(255,255,255,0.18)' }}>{p.port || `${p.mem_mb}MB`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
