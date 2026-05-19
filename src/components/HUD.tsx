import { useEffect } from 'react';
import TopBar from './TopBar';
import WaveformBar from './WaveformBar';
import TasksPanel from './TasksPanel';
import TerminalOutput from './TerminalOutput';
import ProcessesGrid from './ProcessesGrid';
import BottomBar from './BottomBar';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAudio } from '../hooks/useAudio';
import { useAssistantStore } from '../stores/assistantStore';
import { stateColors, fonts } from '../styles/theme';

export default function HUD() {
  const { send } = useWebSocket();
  const { startRecording, stopRecording } = useAudio();
  const orbState = useAssistantStore((s) => s.orbState);
  const transcript = useAssistantStore((s) => s.transcript);
  const response = useAssistantStore((s) => s.response);
  const setOrbState = useAssistantStore((s) => s.setOrbState);
  const reset = useAssistantStore((s) => s.reset);
  const sc = stateColors(orbState);

  // Spacebar push-to-talk
  useEffect(() => {
    let isHolding = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isHolding && orbState === 'idle') {
        e.preventDefault();
        isHolding = true;
        setOrbState('listening');
        startRecording((base64) => {
          send('audio_chunk', { data: base64, sampleRate: 16000 });
        });
      }
      if (e.key === 'Escape') {
        stopRecording();
        reset();
        const api = (window as any).electronAPI;
        api?.hideOverlay();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isHolding) {
        e.preventDefault();
        isHolding = false;
        stopRecording();
        setOrbState('processing');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [orbState, send, startRecording, stopRecording, setOrbState, reset]);

  // Electron IPC toggle
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;
    const unsub1 = api.on('toggle-overlay', () => {
      if (orbState === 'idle') {
        setOrbState('listening');
        startRecording((base64) => {
          send('audio_chunk', { data: base64, sampleRate: 16000 });
        });
      } else if (orbState === 'listening') {
        stopRecording();
        setOrbState('processing');
      }
    });
    const unsub2 = api.on('toggle-mute', () => {
      useAssistantStore.getState().toggleMute();
    });
    return () => { unsub1?.(); unsub2?.(); };
  }, [orbState, send, startRecording, stopRecording, setOrbState]);

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
