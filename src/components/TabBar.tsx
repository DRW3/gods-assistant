import { useAssistantStore } from '../stores/assistantStore';
import { palette, clay, fonts } from '../styles/theme';

export default function TabBar({ onCreateSession, onSwitchSession, onCloseSession }: {
  onCreateSession: () => void;
  onSwitchSession: (id: string) => void;
  onCloseSession: (id: string) => void;
}) {
  const sessions = useAssistantStore((s) => s.sessions);
  const activeSessionId = useAssistantStore((s) => s.activeSessionId);
  const systemSessions = useAssistantStore((s) => s.systemSessions);

  if (sessions.length === 0 && systemSessions.length === 0) return null;

  return (
    <div data-no-drag style={{
      display: 'flex', alignItems: 'center', padding: '8px 12px 6px', gap: 4,
      borderBottom: `1px solid ${palette.white04}`, overflowX: 'auto' as const,
    }}>
      {/* System sessions — real running Claude terminals */}
      {systemSessions.map((s, i) => {
        const isActive = s.id === activeSessionId;
        const statusColor = s.status === 'busy' || s.status === 'running'
          ? palette.gold : s.status === 'idle' ? palette.jade : palette.textMuted;
        return (
          <div key={s.id} onClick={() => onSwitchSession(s.id)}
            title={`${s.command}\n${s.cwd}\nStarted: ${s.started}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', borderRadius: '10px 10px 0 0',
              fontFamily: fonts.mono, fontSize: 8, cursor: 'pointer',
              whiteSpace: 'nowrap' as const, flexShrink: 0,
              background: isActive
                ? `linear-gradient(145deg, ${palette.bgLight}, ${palette.bg})`
                : `linear-gradient(145deg, rgba(26,46,34,0.5), rgba(20,38,28,0.5))`,
              color: isActive ? palette.text : palette.textDim,
              fontWeight: isActive ? 600 : 400,
              border: `2px solid ${isActive ? palette.jade : 'rgba(107,203,155,0.05)'}`,
              borderBottom: 'none',
              boxShadow: isActive ? `0 -2px 8px ${palette.jade}30, 2px -2px 6px rgba(0,0,0,0.2)` : 'none',
            }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: statusColor,
              boxShadow: `0 0 4px ${statusColor}60`,
            }} />
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 1 }}>
              <span style={{ fontSize: 8 }}>{s.name}</span>
              <span style={{ fontSize: 6, color: palette.textMuted }}>
                {s.tty.replace('ttys', 'T')} · {s.status}
              </span>
            </div>
          </div>
        );
      })}

      {/* Divider between system and managed sessions */}
      {systemSessions.length > 0 && sessions.length > 0 && (
        <div style={{ width: 1, height: 20, background: palette.white08, margin: '0 2px', flexShrink: 0 }} />
      )}

      {/* Managed sessions — created by God's Assistant */}
      {sessions.map((s) => {
        const active = s.id === activeSessionId;
        return (
          <div key={s.id} onClick={() => onSwitchSession(s.id)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 10px', borderRadius: '10px 10px 0 0',
            fontFamily: fonts.mono, fontSize: 8, cursor: 'pointer',
            whiteSpace: 'nowrap' as const, flexShrink: 0,
            background: active ? `linear-gradient(145deg, ${palette.bgLight}, ${palette.bg})` : 'transparent',
            color: active ? palette.text : palette.textMuted,
            fontWeight: active ? 600 : 400,
            border: `1px solid ${active ? 'rgba(107,203,155,0.08)' : 'transparent'}`,
            borderBottom: 'none',
            boxShadow: active ? '2px -2px 6px rgba(0,0,0,0.2)' : 'none',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: s.status === 'running' ? palette.jade : s.status === 'error' ? '#f07060' : 'rgba(200,240,216,0.15)',
              boxShadow: s.status === 'running' ? `0 0 4px ${palette.jade}` : 'none',
            }} />
            <span>{s.name.length > 18 ? s.name.slice(0, 18) + '...' : s.name}</span>
            {sessions.length > 1 && (
              <span onClick={(e) => { e.stopPropagation(); onCloseSession(s.id); }}
                style={{ fontSize: 9, color: palette.textMuted, cursor: 'pointer', marginLeft: 2 }}
              >x</span>
            )}
          </div>
        );
      })}

      {/* New session button */}
      <div onClick={onCreateSession} style={{
        width: 22, height: 22, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, color: palette.textMuted, cursor: 'pointer',
        background: `linear-gradient(145deg, ${palette.bgLight}, ${palette.bg})`,
        boxShadow: clay.raisedSm, border: `1px solid ${palette.white02}`,
        flexShrink: 0, marginLeft: 4,
      }}>+</div>
    </div>
  );
}
