import { useEffect, useRef, useCallback, useState } from 'react';
import TopBar from './TopBar';
import WaveformBar from './WaveformBar';
import TasksPanel from './TasksPanel';
import TerminalOutput from './TerminalOutput';
import BottomBar from './BottomBar';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAudio } from '../hooks/useAudio';
import { useAssistantStore } from '../stores/assistantStore';
import { orbGlow } from '../styles/theme';

export default function HUD() {
  const { send } = useWebSocket();
  const { startRecording, stopRecording } = useAudio();
  const orbState = useAssistantStore((s) => s.orbState);
  const transcript = useAssistantStore((s) => s.transcript);
  const response = useAssistantStore((s) => s.response);
  const setOrbState = useAssistantStore((s) => s.setOrbState);
  const reset = useAssistantStore((s) => s.reset);
  const glow = orbGlow(orbState);
  const [textInput, setTextInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div style={{
      width: '100%', minHeight: '100%', borderRadius: 18, overflow: 'hidden', position: 'relative',
      background: 'rgba(8, 10, 18, 0.94)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
      border: '1px solid rgba(255,255,255,0.05)',
      boxShadow: `0 4px 40px rgba(0,0,0,0.5), 0 0 80px ${glow}`,
    }}>
      <TopBar />
      <WaveformBar />

      {/* Text input */}
      <div style={{ padding: '6px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 8 }} data-no-drag>
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
            flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, padding: '7px 12px', color: '#f1f5f9', fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace", outline: 'none',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(34,211,238,0.2)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.06)')}
        />
        <button
          onClick={() => sendTextCommand(textInput)}
          style={{
            background: textInput.trim() ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${textInput.trim() ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: 8, padding: '0 14px', color: textInput.trim() ? '#22d3ee' : 'rgba(255,255,255,0.2)',
            fontSize: 11, fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
          }}
        >
          ↵
        </button>
      </div>

      {/* Transcript */}
      {(transcript || response) && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          {transcript && <div style={{ fontSize: 13, color: '#f1f5f9', lineHeight: 1.5 }}>"{transcript}"</div>}
          {response && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: transcript ? 6 : 0, paddingTop: transcript ? 6 : 0, borderTop: transcript ? '1px solid rgba(255,255,255,0.03)' : 'none', lineHeight: 1.5 }}>{response}</div>}
        </div>
      )}

      <TasksPanel />
      <TerminalOutput />
      <BottomBar />
    </div>
  );
}
