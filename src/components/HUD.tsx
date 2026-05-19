import { useEffect, useRef, useCallback, useState } from 'react';
import TopBar from './TopBar';
import WaveformBar from './WaveformBar';
import TasksPanel from './TasksPanel';
import TerminalOutput from './TerminalOutput';
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
  const tasks = useAssistantStore((s) => s.tasks);
  const lines = useAssistantStore((s) => s.terminalLines);
  const setOrbState = useAssistantStore((s) => s.setOrbState);
  const reset = useAssistantStore((s) => s.reset);
  const glow = orbGlow(orbState);
  const [textInput, setTextInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sendTextCommand = useCallback((text: string) => {
    if (!text.trim()) return;
    console.log('[HUD] text command:', text);
    useAssistantStore.getState().setTasks([]);
    useAssistantStore.getState().clearTerminal();
    useAssistantStore.getState().setTranscript(text);
    useAssistantStore.getState().setResponse('');
    setOrbState('processing');
    send('text_command', { text: text.trim() });
    setTextInput('');
  }, [send, setOrbState]);

  // Use ref to track holding state — avoids stale closure
  const isHoldingRef = useRef(false);
  const orbStateRef = useRef(orbState);
  orbStateRef.current = orbState;

  const beginRecording = useCallback(() => {
    console.log('[HUD] beginRecording, current state:', orbStateRef.current);
    // Clear previous results
    useAssistantStore.getState().setTasks([]);
    useAssistantStore.getState().clearTerminal();
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

  // Spacebar push-to-talk — single registration, uses refs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture SPACE when typing in the text input
      if (document.activeElement === inputRef.current) return;

      if (e.code === 'Space' && !isHoldingRef.current) {
        e.preventDefault();
        console.log('[HUD] SPACE down — start recording (was:', orbStateRef.current, ')');
        isHoldingRef.current = true;
        beginRecording();
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
  }, [transcript, response, tasks.length, lines.length]);

  return (
    <div ref={containerRef} style={{
      width: '100%', minHeight: '100%', borderRadius: radius.overlay, overflow: 'hidden', position: 'relative',
      background: `linear-gradient(145deg, ${palette.bgLight}, ${palette.bg})`,
      boxShadow: `${clay.overlay}, 0 0 80px ${glow}`,
      border: '1px solid rgba(107,203,155,0.06)',
    }}>
      <TopBar />
      <WaveformBar />

      {/* Text input */}
      <div style={{ padding: '8px 20px' }} data-no-drag>
        <div style={{
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
          >🎤</button>
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
      </div>

      {/* Transcript / Response */}
      {(transcript || response) && (
        <div style={{
          background: `linear-gradient(145deg, ${palette.bgLight}ee, ${palette.bg})`,
          borderRadius: radius.card,
          boxShadow: clay.raised,
          border: `1px solid ${palette.white02}`,
          padding: '14px 18px',
          margin: '0 20px 10px',
        }}>
          {transcript && <div style={{ fontSize: 11, color: palette.text, fontFamily: fonts.mono, lineHeight: 1.5 }}>"{transcript}"</div>}
          {response && <div style={{ fontSize: 12, color: palette.textDim, marginTop: transcript ? 6 : 0, paddingTop: transcript ? 6 : 0, borderTop: transcript ? `1px solid ${palette.white02}` : 'none', lineHeight: 1.7, maxHeight: 200, overflowY: 'auto' as const }}>{response}</div>}
        </div>
      )}

      <TasksPanel />
      <TerminalOutput />
      <BottomBar />
    </div>
  );
}
