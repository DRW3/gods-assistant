import { useEffect } from 'react';
import OrbScene from './Orb/OrbScene';
import Waveform from './Waveform';
import Transcript from './Transcript';
import ActionFeed from './ActionFeed';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAudio } from '../hooks/useAudio';
import { useAssistantStore } from '../stores/assistantStore';
import { colors, fonts } from '../styles/theme';

export default function HUD() {
  const { send } = useWebSocket();
  const { startRecording, stopRecording } = useAudio();
  const { orbState, setOrbState, reset } = useAssistantStore();

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    api.on('toggle-overlay', () => {
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

    api.on('toggle-mute', () => {
      useAssistantStore.getState().toggleMute();
    });
  }, [orbState, send, startRecording, stopRecording, setOrbState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopRecording();
        reset();
        const api = (window as any).electronAPI;
        api?.hideOverlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stopRecording, reset]);

  return (
    <div
      className="glass-panel glow"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 0 12px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative', width: '200px', height: '200px' }}>
        <OrbScene />
        <Waveform />
      </div>
      <Transcript />
      <ActionFeed />
      <div
        style={{
          marginTop: 'auto',
          padding: '8px 20px',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          fontFamily: fonts.mono,
          fontSize: '10px',
          color: colors.textDim,
        }}
      >
        <span>{'\u2318\u21E7G'} speak</span>
        <span>{'\u00B7'}</span>
        <span>{'\u2318\u21E7S'} mute</span>
        <span>{'\u00B7'}</span>
        <span>esc close</span>
      </div>
    </div>
  );
}
