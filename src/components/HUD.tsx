import { useEffect, useRef, useCallback } from 'react';
import TopBar from './TopBar';
import WaveformBar from './WaveformBar';
import TasksPanel from './TasksPanel';
import TerminalOutput from './TerminalOutput';
import ProcessesGrid from './ProcessesGrid';
import BottomBar from './BottomBar';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAudio } from '../hooks/useAudio';
import { useAssistantStore } from '../stores/assistantStore';
import { stateColors } from '../styles/theme';

export default function HUD() {
  const { send } = useWebSocket();
  const { startRecording, stopRecording } = useAudio();
  const orbState = useAssistantStore((s) => s.orbState);
  const transcript = useAssistantStore((s) => s.transcript);
  const response = useAssistantStore((s) => s.response);
  const setOrbState = useAssistantStore((s) => s.setOrbState);
  const reset = useAssistantStore((s) => s.reset);
  const sc = stateColors(orbState);

  // Use ref to track holding state — avoids stale closure
  const isHoldingRef = useRef(false);
  const orbStateRef = useRef(orbState);
  orbStateRef.current = orbState;

  const beginRecording = useCallback(() => {
    console.log('[HUD] beginRecording, current state:', orbStateRef.current);
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
      if (e.code === 'Space' && !isHoldingRef.current && orbStateRef.current === 'idle') {
        e.preventDefault();
        console.log('[HUD] SPACE down — start recording');
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
      boxShadow: `0 4px 40px rgba(0,0,0,0.5), 0 0 80px ${sc.glow}15`,
    }}>
      <TopBar />
      <WaveformBar />

      {/* Transcript */}
      {(transcript || response) && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          {transcript && <div style={{ fontSize: 13, color: '#f1f5f9', lineHeight: 1.5 }}>"{transcript}"</div>}
          {response && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: transcript ? 6 : 0, paddingTop: transcript ? 6 : 0, borderTop: transcript ? '1px solid rgba(255,255,255,0.03)' : 'none', lineHeight: 1.5 }}>{response}</div>}
        </div>
      )}

      <TasksPanel />
      <TerminalOutput />
      <ProcessesGrid />
      <BottomBar />
    </div>
  );
}
