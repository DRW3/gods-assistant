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

  if (sessions.length === 0) return null;

  return (
    <div data-no-drag style={{
      display: 'flex', alignItems: 'center', padding: '6px 10px 0', gap: 3,
      borderBottom: `1px solid ${palette.white04}`, overflowX: 'auto' as const,
    }}>
      {sessions.map((s) => {
        const active = s.id === activeSessionId;
        return (
          <div key={s.id} onClick={() => onSwitchSession(s.id)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: '10px 10px 0 0',
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
              width: 5, height: 5, borderRadius: '50%',
              background: s.status === 'running' ? palette.jade : s.status === 'error' ? '#f07060' : 'rgba(200,240,216,0.15)',
              boxShadow: s.status === 'running' ? `0 0 4px ${palette.jade}` : 'none',
              animation: s.status === 'running' ? 'pulse 2s ease-in-out infinite' : 'none',
            }} />
            <div style={{ display: 'flex', flexDirection: 'column' as const }}>
              <span>{s.name.length > 18 ? s.name.slice(0, 18) + '...' : s.name}</span>
              {s.context_summary && (
                <span style={{ fontSize: 6, color: palette.textMuted, opacity: 0.6, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.context_summary.length > 30 ? s.context_summary.slice(0, 30) + '...' : s.context_summary}
                </span>
              )}
            </div>
            {sessions.length > 1 && (
              <span onClick={(e) => { e.stopPropagation(); onCloseSession(s.id); }}
                style={{ fontSize: 9, color: palette.textMuted, cursor: 'pointer', marginLeft: 2 }}
              >x</span>
            )}
          </div>
        );
      })}
      {/* System sessions divider */}
      {systemSessions.length > 0 && sessions.length > 0 && (
        <div style={{ width: 1, height: 16, background: palette.white08, margin: '0 4px', flexShrink: 0 }} />
      )}

      {/* External system sessions */}
      {systemSessions.map((s) => (
        <div key={s.id} onClick={() => onSwitchSession(s.id)} title={`${s.command}\n${s.cwd}\nStarted: ${s.started}`} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 8px', borderRadius: '10px 10px 0 0',
          fontFamily: fonts.mono, fontSize: 7, cursor: 'pointer',
          whiteSpace: 'nowrap' as const, flexShrink: 0,
          background: 'transparent',
          color: palette.textMuted,
          border: `1px dashed rgba(107,203,155,0.08)`,
          borderBottom: 'none',
          opacity: 0.7,
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: s.status === 'running' ? '#f0c060' : s.status === 'idle' ? palette.jade : 'rgba(200,240,216,0.15)',
            boxShadow: s.status !== 'unknown' ? `0 0 3px ${s.status === 'running' ? '#f0c060' : palette.jade}` : 'none',
          }} />
          <div style={{ display: 'flex', flexDirection: 'column' as const }}>
            <span>{s.name}</span>
            <span style={{ fontSize: 5, opacity: 0.5 }}>{s.tty} · pid {s.pid}</span>
          </div>
        </div>
      ))}

      <div onClick={onCreateSession} style={{
        width: 20, height: 20, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: palette.textMuted, cursor: 'pointer',
        background: `linear-gradient(145deg, ${palette.bgLight}, ${palette.bg})`,
        boxShadow: clay.raisedSm, border: `1px solid ${palette.white02}`,
        flexShrink: 0, marginLeft: 2,
      }}>+</div>
    </div>
  );
}
