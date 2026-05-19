import { create } from 'zustand';
import type { OrbState } from '../styles/theme';

interface Action {
  id: string;
  label: string;
  status: 'running' | 'done' | 'error';
  timestamp: number;
}

interface AssistantState {
  orbState: OrbState;
  transcript: string;
  response: string;
  actions: Action[];
  isVisible: boolean;
  isMuted: boolean;
  waveformData: Float32Array;

  setOrbState: (state: OrbState) => void;
  setTranscript: (text: string) => void;
  setResponse: (text: string) => void;
  addAction: (action: Action) => void;
  updateAction: (id: string, status: Action['status']) => void;
  setVisible: (visible: boolean) => void;
  toggleMute: () => void;
  setWaveformData: (data: Float32Array) => void;
  reset: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  orbState: 'idle',
  transcript: '',
  response: '',
  actions: [],
  isVisible: false,
  isMuted: false,
  waveformData: new Float32Array(128),

  setOrbState: (orbState) => set({ orbState }),
  setTranscript: (transcript) => set({ transcript }),
  setResponse: (response) => set({ response }),
  addAction: (action) => set((s) => ({ actions: [...s.actions.slice(-9), action] })),
  updateAction: (id, status) =>
    set((s) => ({
      actions: s.actions.map((a) => (a.id === id ? { ...a, status } : a)),
    })),
  setVisible: (isVisible) => set({ isVisible }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  setWaveformData: (waveformData) => set({ waveformData }),
  reset: () => set({ orbState: 'idle', transcript: '', response: '', actions: [] }),
}));
