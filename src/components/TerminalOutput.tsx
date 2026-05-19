import { useRef, useEffect } from 'react';
import { useAssistantStore } from '../stores/assistantStore';
import { palette, clay, fonts, radius } from '../styles/theme';

export default function TerminalOutput() {
  const lines = useAssistantStore((s) => s.terminalLines);
  const expanded = useAssistantStore((s) => s.expandedSections.terminal);
  const toggle = useAssistantStore((s) => s.toggleSection);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  if (lines.length === 0) return null;

  return (
    <div style={{ borderBottom: `1px solid ${palette.white04}` }} data-no-drag>
      <div onClick={() => toggle('terminal')} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 20px', cursor: 'pointer',
      }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 9, color: palette.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
          {expanded ? '▾' : '▸'} Terminal
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: palette.danger, boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1)' }} />
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: palette.gold, boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1)' }} />
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: palette.jade, boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1)' }} />
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '0 20px 10px' }}>
          <div ref={scrollRef} style={{
            background: `linear-gradient(145deg, ${palette.bgDark}, #08140c)`,
            borderRadius: radius.terminal, padding: '12px 14px',
            boxShadow: clay.sunken, border: `1px solid ${palette.white02}`,
            fontFamily: fonts.mono, fontSize: 10, lineHeight: 1.8,
            maxHeight: 130, overflowY: 'auto' as const,
          }}>
            {lines.map((l, i) => (
              <div key={i} style={{
                color: l.type === 'cmd' ? palette.jade
                  : l.status === 'ok' ? palette.success
                  : l.status === 'error' ? palette.danger
                  : palette.textDim,
                paddingLeft: l.type === 'output' ? 14 : 0,
              }}>
                {l.type === 'cmd' ? `❯ ${l.text}` : `→ ${l.text}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
