import React from 'react';
import { useAssistantStore } from '../stores/assistantStore';
import { palette, clay, fonts, radius } from '../styles/theme';

export default function BottomBar() {
  const mode = useAssistantStore((s) => s.inputMode);
  const setMode = useAssistantStore((s) => s.setInputMode);

  const btn = (active: boolean): React.CSSProperties => ({
    fontFamily: fonts.mono, fontSize: 8, borderRadius: radius.button - 4, padding: '4px 10px',
    cursor: 'pointer', border: 'none', outline: 'none', letterSpacing: 0.3,
    background: active ? `linear-gradient(135deg, ${palette.jade}, ${palette.jadeMuted})` : `linear-gradient(145deg, ${palette.bgLight}, ${palette.bg})`,
    color: active ? palette.bgDark : palette.textMuted,
    fontWeight: active ? 700 : 400,
    boxShadow: active ? clay.button : '2px 2px 5px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.02)',
    borderWidth: 1, borderStyle: 'solid' as const,
    borderColor: active ? `${palette.jade}40` : palette.white04,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }} data-no-drag>
      <div style={{ display: 'flex', gap: 4 }}>
        <button style={btn(mode === 'push-to-talk')} onClick={() => setMode('push-to-talk')}>PUSH-TO-TALK</button>
        <button style={btn(mode === 'always-on')} onClick={() => setMode('always-on')}>ALWAYS ON</button>
      </div>
      <div style={{ fontFamily: fonts.mono, fontSize: 7, color: palette.textMuted, display: 'flex', gap: 10 }}>
        <span>⌘⇧G summon</span>
        <span>SPACE speak</span>
        <span>ESC close</span>
      </div>
    </div>
  );
}
