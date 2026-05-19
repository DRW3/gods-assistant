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
    setTasks, updateTask, addTerminalLine,
    setProcesses, setSystemStats,
  } = useAssistantStore();

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[ws] connected');
      ws.send(JSON.stringify({ type: 'get_processes' }));
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
          setOrbState('speaking');
          // Play TTS audio if present
          if (msg.payload.audio) {
            const audioBytes = Uint8Array.from(atob(msg.payload.audio as string), c => c.charCodeAt(0));
            const blob = new Blob([audioBytes], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => {
              URL.revokeObjectURL(url);
              setOrbState('idle');
            };
            audio.play().catch(() => setOrbState('idle'));
          } else {
            setTimeout(() => setOrbState('idle'), 2000);
          }
          break;

        case 'state':
          setOrbState(msg.payload.state as 'idle' | 'listening' | 'processing' | 'speaking');
          break;

        case 'system_stats':
          setSystemStats(msg.payload as any);
          break;

        case 'processes':
          setProcesses((msg.payload as any).processes || []);
          break;

        case 'task_update': {
          const t = msg.payload as any;
          if (t.tasks) {
            setTasks(t.tasks);
          } else if (t.id) {
            updateTask(t.id, t);
          }
          break;
        }

        case 'terminal_line':
          addTerminalLine(msg.payload as any);
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
  }, [setOrbState, setTranscript, setResponse, setTasks, updateTask, addTerminalLine, setProcesses, setSystemStats]);

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
