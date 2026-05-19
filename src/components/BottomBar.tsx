import { useAssistantStore } from '../stores/assistantStore';
import { fonts } from '../styles/theme';

export default function BottomBar() {
  const inputMode = useAssistantStore((s) => s.inputMode);
  const setInputMode = useAssistantStore((s) => s.setInputMode);

  const btnStyle = (active: boolean) => ({
    fontFamily: fonts.mono, fontSize: 8, borderRadius: 4, padding: '3px 8px', cursor: 'pointer' as const, border: 'none' as const, outline: 'none' as const,
    color: active ? '#22d3ee' : 'rgba(255,255,255,0.18)',
    background: active ? 'rgba(34,211,238,0.05)' : 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderStyle: 'solid' as const,
    borderColor: active ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.04)',
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px' }} data-no-drag>
      <div style={{ display: 'flex', gap: 4 }}>
        <button style={btnStyle(inputMode === 'push-to-talk')} onClick={() => setInputMode('push-to-talk')}>PUSH-TO-TALK</button>
        <button style={btnStyle(inputMode === 'always-on')} onClick={() => setInputMode('always-on')}>ALWAYS ON</button>
      </div>
      <div style={{ fontFamily: fonts.mono, fontSize: 8, color: 'rgba(255,255,255,0.1)', display: 'flex', gap: 10 }}>
        <span>{'\u2318\u21E7G'} summon</span>
        <span>SPACE speak</span>
        <span>ESC close</span>
      </div>
    </div>
  );
}
