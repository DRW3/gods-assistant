import { useAssistantStore } from '../stores/assistantStore';
import { palette, clay, fonts, radius } from '../styles/theme';

const icons: Record<string, string> = { done: '✓', running: '⟳', pending: '○', error: '✗' };
const iconBg: Record<string, string> = {
  done: `linear-gradient(135deg, ${palette.jade}, ${palette.jadeMuted})`,
  running: `linear-gradient(135deg, ${palette.gold}, ${palette.goldMuted})`,
  pending: `linear-gradient(135deg, #3a5040, #2a3a30)`,
  error: `linear-gradient(135deg, ${palette.danger}, #c04040)`,
};

export default function TasksPanel() {
  const tasks = useAssistantStore((s) => s.tasks);
  const expanded = useAssistantStore((s) => s.expandedSections.tasks);
  const toggle = useAssistantStore((s) => s.toggleSection);

  if (tasks.length === 0) return null;
  const done = tasks.filter((t) => t.status === 'done').length;

  return (
    <div style={{ borderBottom: `1px solid ${palette.white04}` }} data-no-drag>
      <div onClick={() => toggle('tasks')} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 20px', cursor: 'pointer',
      }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 9, color: palette.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
          {expanded ? '▾' : '▸'} Agents
        </span>
        <span style={{
          fontFamily: fonts.mono, fontSize: 8, color: palette.jade,
          background: palette.jadeDim, borderRadius: 8, padding: '3px 8px',
        }}>{done}/{tasks.length}</span>
      </div>
      {expanded && (
        <div style={{ padding: '0 20px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tasks.map((t) => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              background: `linear-gradient(145deg, ${palette.bgLight}, ${palette.bg})`,
              borderRadius: radius.agent, fontFamily: fonts.mono, fontSize: 10,
              boxShadow: clay.raisedSm, border: `1px solid ${palette.white02}`,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, color: 'white', background: iconBg[t.status],
                boxShadow: '2px 2px 5px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.15)',
              }}>{icons[t.status]}</div>
              <span style={{ flex: 1, color: t.status === 'running' ? palette.text : palette.textDim }}>{t.name}</span>
              <span style={{ fontSize: 8, color: palette.textMuted }}>{t.detail}</span>
              <span style={{ fontSize: 8, color: palette.textMuted }}>{t.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
