import { useRef, useEffect } from 'react';
import { useAssistantStore } from '../stores/assistantStore';
import { fonts, colors } from '../styles/theme';

export default function TerminalOutput() {
  const lines = useAssistantStore((s) => s.terminalLines);
  const expanded = useAssistantStore((s) => s.expandedSections.terminal);
  const toggle = useAssistantStore((s) => s.toggleSection);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  if (lines.length === 0) return null;

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} data-no-drag>
      <div onClick={() => toggle('terminal')} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', cursor: 'pointer',
      }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 9, fontWeight: 500, color: 'rgba(255,255,255,0.2)', letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
          {expanded ? '\u25BE' : '\u25B8'} Terminal
        </span>
        <span style={{ fontFamily: fonts.mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3, padding: '2px 6px' }}>
          {lines.filter((l) => l.type === 'cmd').length} cmds
        </span>
      </div>
      {expanded && (
        <div style={{ padding: '0 16px 10px' }}>
          <div ref={scrollRef} style={{
            background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.03)',
            borderRadius: 8, padding: '8px 10px', maxHeight: 100, overflowY: 'auto' as const,
            fontFamily: fonts.mono, fontSize: 10, lineHeight: 1.7,
          }}>
            {lines.map((line, i) => (
              <div key={i} style={{
                color: line.type === 'cmd' ? '#22d3ee' : line.status === 'ok' ? colors.success : line.status === 'error' ? colors.danger : 'rgba(255,255,255,0.35)',
                paddingLeft: line.type === 'output' ? 14 : 0,
              }}>
                {line.type === 'cmd' ? `\u276F ${line.text}` : `\u2192 ${line.text}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
