import { useAssistantStore } from '../stores/assistantStore';
import { fonts, colors } from '../styles/theme';

const icons = { done: '\u2713', running: '\u27F3', pending: '\u25CB', error: '\u2717' };
const iconColors = { done: colors.success, running: '#22d3ee', pending: 'rgba(255,255,255,0.12)', error: colors.danger };

export default function TasksPanel() {
  const tasks = useAssistantStore((s) => s.tasks);
  const expanded = useAssistantStore((s) => s.expandedSections.tasks);
  const toggle = useAssistantStore((s) => s.toggleSection);

  if (tasks.length === 0) return null;

  const doneCount = tasks.filter((t) => t.status === 'done').length;

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} data-no-drag>
      <div onClick={() => toggle('tasks')} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', cursor: 'pointer',
      }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 9, fontWeight: 500, color: 'rgba(255,255,255,0.2)', letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
          {expanded ? '\u25BE' : '\u25B8'} Tasks
        </span>
        <span style={{ fontFamily: fonts.mono, fontSize: 8, color: '#22d3ee', background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.1)', borderRadius: 3, padding: '2px 6px' }}>
          {doneCount}/{tasks.length} complete
        </span>
      </div>
      {expanded && (
        <div style={{ padding: '0 16px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {tasks.map((task) => (
            <div key={task.id} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '5px 9px',
              background: task.status === 'running' ? 'rgba(34,211,238,0.02)' : 'rgba(255,255,255,0.015)',
              border: `1px solid ${task.status === 'running' ? 'rgba(34,211,238,0.05)' : 'rgba(255,255,255,0.02)'}`,
              borderRadius: 7, fontFamily: fonts.mono, fontSize: 10,
            }}>
              <span style={{ width: 14, textAlign: 'center' as const, color: iconColors[task.status], fontSize: 10 }}>{icons[task.status]}</span>
              <span style={{ flex: 1, color: task.status === 'running' ? '#f1f5f9' : 'rgba(255,255,255,0.5)' }}>{task.name}</span>
              <span style={{ fontSize: 8, color: task.status === 'done' ? 'rgba(16,185,129,0.5)' : task.status === 'running' ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.2)' }}>{task.detail}</span>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.12)', minWidth: 30, textAlign: 'right' as const }}>{task.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
