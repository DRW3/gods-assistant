import { useEffect, useRef, useCallback } from 'react';
import { useAssistantStore } from '../stores/assistantStore';

const WS_URL = 'ws://localhost:9377';

interface WSMessage {
  type: string;
  payload: Record<string, unknown>;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const {
    setOrbState, setTranscript, setResponse,
    addStreamItem,
    setSystemStats,
  } = useAssistantStore();

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[ws] connected');
      // Only scan existing sessions — don't auto-create new ones
      ws.send(JSON.stringify({ type: 'scan_sessions' }));
    };

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);

      switch (msg.type) {
        case 'transcript':
          setTranscript(msg.payload.text as string);
          if (msg.payload.final) {
            setOrbState('processing');
          }
          break;

        case 'action':
          if (msg.payload.status === 'running') {
            setOrbState('executing');
          }
          break;

        case 'response':
          setResponse(msg.payload.text as string);
          // Text arrives instantly — don't wait for audio
          if (!msg.payload.audio) {
            setOrbState('speaking');
          }
          break;

        case 'audio': {
          // TTS audio arrives separately after text
          setOrbState('speaking');
          const audioB64 = msg.payload.audio as string;
          if (audioB64) {
            const audioBytes = Uint8Array.from(atob(audioB64), c => c.charCodeAt(0));
            const blob = new Blob([audioBytes], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => {
              URL.revokeObjectURL(url);
              setOrbState('idle');
            };
            audio.play().catch(() => setOrbState('idle'));
          }
          break;
        }

        case 'state':
          setOrbState(msg.payload.state as 'idle' | 'listening' | 'processing' | 'speaking');
          break;

        case 'system_stats':
          setSystemStats(msg.payload as any);
          break;

        case 'stream_item':
          addStreamItem(msg.payload as any);
          break;

        case 'sessions_list': {
          const p = msg.payload as any;
          const oldSessions = useAssistantStore.getState().sessions;
          useAssistantStore.getState().setSessions(p.sessions || [], p.active_id);
          // Spawn terminal for any new session
          const oldIds = new Set(oldSessions.map((s: any) => s.id));
          for (const s of (p.sessions || [])) {
            if (!oldIds.has(s.id)) {
              const api = (window as any).electronAPI;
              api?.invoke('spawn-terminal', { sessionId: s.id, name: s.name });
            }
          }
          break;
        }
        case 'session_switched':
          useAssistantStore.getState().setActiveSession((msg.payload as any).active_id);
          useAssistantStore.getState().clearStream();
          break;

        case 'system_sessions':
          useAssistantStore.getState().setSystemSessions((msg.payload as any).sessions || []);
          break;

        case 'effort_changed':
          useAssistantStore.getState().setEffort(msg.payload.level as any);
          break;

        case 'pong':
          break;

        default:
          console.log('[ws] unknown message:', msg);
      }
    };

    ws.onclose = () => {
      console.log('[ws] disconnected, reconnecting...');
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = (err) => {
      console.error('[ws] error:', err);
      ws.close();
    };
  }, [setOrbState, setTranscript, setResponse, addStreamItem, setSystemStats]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  return { send, ws: wsRef };
}
