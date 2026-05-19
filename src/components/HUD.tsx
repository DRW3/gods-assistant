import { useEffect, useRef, useCallback, useState } from 'react';
import TabBar from './TabBar';
import TopBar from './TopBar';
import WaveformBar from './WaveformBar';
import ActivityStream from './ActivityStream';
import BottomBar from './BottomBar';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAudio } from '../hooks/useAudio';
import { useAssistantStore } from '../stores/assistantStore';
import { palette, clay, fonts, radius, orbGlow } from '../styles/theme';

export default function HUD() {
  const { send } = useWebSocket();
  const { startRecording, stopRecording } = useAudio();
  const orbState = useAssistantStore((s) => s.orbState);
  const transcript = useAssistantStore((s) => s.transcript);
  const response = useAssistantStore((s) => s.response);
  const streamItems = useAssistantStore((s) => s.streamItems);
  const setOrbState = useAssistantStore((s) => s.setOrbState);
  const effort = useAssistantStore((s) => s.effort);
  const reset = useAssistantStore((s) => s.reset);
  const glow = orbGlow(orbState);
  const createSession = useCallback(() => send('create_session', { name: '' }), [send]);
  const switchSession = useCallback((id: string) => send('switch_session', { session_id: id }), [send]);
  const closeSession = useCallback((id: string) => send('close_session', { session_id: id }), [send]);
  const [textInput, setTextInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sendTextCommand = useCallback((text: string) => {
    if (!text.trim()) return;
    console.log('[HUD] text command:', text);
    useAssistantStore.getState().clearStream();
    useAssistantStore.getState().setTranscript(text);
    useAssistantStore.getState().setResponse('');
    setOrbState('processing');
    send('text_command', { text: text.trim(), effort: useAssistantStore.getState().effort });
    setTextInput('');
  }, [send, setOrbState]);

  // Use ref to track holding state — avoids stale closure
  const isHoldingRef = useRef(false);
  const orbStateRef = useRef(orbState);
  orbStateRef.current = orbState;

  const beginRecording = useCallback(() => {
    console.log('[HUD] beginRecording, current state:', orbStateRef.current);
    // Clear previous results
    useAssistantStore.getState().clearStream();
    useAssistantStore.getState().setTranscript('');
    useAssistantStore.getState().setResponse('');
    setOrbState('listening');
    startRecording((base64) => {
      console.log('[HUD] audio chunk ready, sending to engine');
      send('audio_chunk', { data: base64, sampleRate: 16000 });
    });
  }, [setOrbState, startRecording, send]);

  const endRecording = useCallback(() => {
    console.log('[HUD] endRecording');
    stopRecording();
    setOrbState('processing');
  }, [stopRecording, setOrbState]);

  // Reset to clean state on mount — starts compact
  useEffect(() => {
    useAssistantStore.getState().reset();
    if (inputRef.current) inputRef.current.blur();
  }, []);

  // Spacebar push-to-talk — single registration, uses refs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture SPACE when typing in the text input
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

      if (e.code === 'Space' && !isHoldingRef.current) {
        e.preventDefault();
        console.log('[HUD] SPACE down — start recording (was:', orbStateRef.current, ')');
        isHoldingRef.current = true;
        beginRecording();
      }
      // O+G chord — quick dismiss/summon (within overlay)
      if (e.key === 'o' || e.key === 'O') {
        (window as any).__ogPending = Date.now();
      }
      if ((e.key === 'g' || e.key === 'G') && (window as any).__ogPending && Date.now() - (window as any).__ogPending < 500) {
        (window as any).__ogPending = 0;
        console.log('[HUD] O+G chord — hiding');
        const api = (window as any).electronAPI;
        api?.hideOverlay();
        return;
      }

      if (e.key === 'Escape') {
        console.log('[HUD] ESC — closing');
        isHoldingRef.current = false;
        stopRecording();
        reset();
        const api = (window as any).electronAPI;
        api?.hideOverlay();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isHoldingRef.current) {
        e.preventDefault();
        console.log('[HUD] SPACE up — stop recording');
        isHoldingRef.current = false;
        endRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [beginRecording, endRecording, stopRecording, reset]);

  // Electron IPC toggle (Cmd+Shift+G)
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;
    const unsub = api.on('toggle-overlay', () => {
      console.log('[HUD] toggle-overlay IPC, state:', orbStateRef.current);
      if (orbStateRef.current === 'idle') {
        beginRecording();
      } else if (orbStateRef.current === 'listening') {
        endRecording();
      }
    });
    return () => { unsub?.(); };
  }, [beginRecording, endRecording]);

  // Safety timeout — reset to idle if stuck for 60s
  useEffect(() => {
    if (orbState === 'idle' || orbState === 'listening') return;
    const timer = setTimeout(() => {
      console.log('[HUD] safety timeout — resetting to idle from', orbState);
      useAssistantStore.getState().setOrbState('idle');
    }, 60000);
    return () => clearTimeout(timer);
  }, [orbState]);

  // Mute toggle
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;
    const unsub = api.on('toggle-mute', () => {
      useAssistantStore.getState().toggleMute();
    });
    return () => { unsub?.(); };
  }, []);

  // Auto-resize window based on content height
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const h = containerRef.current.scrollHeight;
        const api = (window as any).electronAPI;
        api?.invoke('resize-window', { height: Math.min(Math.max(h + 2, 140), 700) });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [transcript, response, streamItems.length]);

  return (
    <div ref={containerRef} style={{
      width: '100%', borderRadius: radius.overlay, overflow: 'hidden', position: 'relative',
      background: `linear-gradient(145deg, ${palette.bgLight}, ${palette.bg})`,
      boxShadow: `${clay.overlay}, 0 0 80px ${glow}`,
      border: '1px solid rgba(107,203,155,0.06)',
      display: 'flex', flexDirection: 'column',
    }}>
      <TabBar onCreateSession={createSession} onSwitchSession={switchSession} onCloseSession={closeSession} />
      <TopBar />
      <WaveformBar />

      {/* Scrollable middle — only takes space when there's content */}
      <div style={{ overflowY: 'auto' as const, maxHeight: 440 }}>
        <ActivityStream />
        {/* Response card */}
        {(transcript || response) && (
          <div style={{ padding: '6px 20px 10px' }}>
            <div style={{
              background: `linear-gradient(145deg, ${palette.bgLight}ee, ${palette.bg})`,
              borderRadius: radius.card,
              boxShadow: clay.raised,
              border: `1px solid ${palette.white02}`,
              padding: '14px 18px',
            }}>
              {transcript && <div style={{ fontSize: 11, color: palette.text, fontFamily: fonts.mono, lineHeight: 1.5 }}>"{transcript}"</div>}
              {response && <div style={{ fontSize: 12, color: palette.textDim, marginTop: transcript ? 6 : 0, paddingTop: transcript ? 6 : 0, borderTop: transcript ? `1px solid ${palette.white02}` : 'none', lineHeight: 1.7, maxHeight: 200, overflowY: 'auto' as const }}>{response}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Bottom dock - always visible */}
      <div style={{ borderTop: `1px solid ${palette.white04}`, padding: '10px 16px 12px' }}>
        {/* Input pill */}
        <div data-no-drag style={{
          background: 'linear-gradient(145deg, #122418, #0e2014)',
          borderRadius: radius.pill,
          boxShadow: clay.sunken,
          border: `1px solid ${palette.white02}`,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 4px 4px 16px',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                sendTextCommand(textInput);
              }
              e.stopPropagation();
            }}
            placeholder="Type a command... (or hold SPACE to speak)"
            style={{
              flex: 1, background: 'transparent', border: 'none',
              padding: '7px 0', color: palette.text, fontSize: 11,
              fontFamily: fonts.mono, outline: 'none',
            }}
          />
          <button
            onClick={() => {
              if (orbState === 'idle') beginRecording();
              else if (orbState === 'listening') endRecording();
            }}
            style={{
              background: `linear-gradient(145deg, ${palette.bgLight}, ${palette.bg})`,
              borderRadius: 12,
              padding: '7px 10px',
              fontSize: 13,
              color: palette.textMuted,
              boxShadow: clay.raisedSm,
              border: 'none',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >{'\u{1F3A4}'}</button>
          <button
            onClick={() => sendTextCommand(textInput)}
            style={{
              background: `linear-gradient(135deg, ${palette.gold}, ${palette.goldMuted})`,
              color: palette.bgDark,
              borderRadius: radius.button,
              boxShadow: clay.button,
              fontWeight: 700,
              fontSize: 10,
              padding: '7px 14px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: fonts.mono,
            }}
          >
            Send
          </button>
        </div>
        {/* Effort selector */}
        <div data-no-drag style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0' }}>
          <span style={{ fontFamily: fonts.mono, fontSize: 7, color: palette.textMuted, letterSpacing: 1 }}>EFFORT</span>
          {(['auto', 'fast', 'balanced', 'max'] as const).map((level) => {
            const active = effort === level;
            const labels: Record<string, string> = { auto: '\u26A1 Auto', fast: '\uD83C\uDFCE Fast', balanced: '\u2696 Balanced', max: '\uD83E\uDDE0 Max' };
            const hints: Record<string, string> = { auto: 'Smart routing', fast: 'Groq only ~200ms', balanced: 'Groq + Claude', max: 'Claude Code always' };
            return (
              <button
                key={level}
                title={hints[level]}
                onClick={() => {
                  useAssistantStore.getState().setEffort(level);
                  send('set_effort', { level });
                }}
                style={{
                  fontFamily: fonts.mono, fontSize: 7, borderRadius: 8, padding: '3px 8px',
                  cursor: 'pointer', border: 'none', outline: 'none',
                  background: active
                    ? level === 'fast' ? `linear-gradient(135deg, ${palette.jade}, ${palette.jadeMuted})`
                    : level === 'max' ? `linear-gradient(135deg, #b49cdb, #7e5fad)`
                    : `linear-gradient(135deg, ${palette.gold}, ${palette.goldMuted})`
                    : `linear-gradient(145deg, ${palette.bgLight}, ${palette.bg})`,
                  color: active
                    ? level === 'max' ? 'white' : palette.bgDark
                    : palette.textMuted,
                  fontWeight: active ? 700 : 400,
                  boxShadow: active ? clay.button : '2px 2px 5px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.02)',
                  borderWidth: 1, borderStyle: 'solid' as const,
                  borderColor: active ? 'transparent' : palette.white04,
                }}
              >
                {labels[level]}
              </button>
            );
          })}
        </div>
        <BottomBar />
      </div>
    </div>
  );
}
