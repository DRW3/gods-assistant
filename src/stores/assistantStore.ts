import { create } from 'zustand';
import type { OrbState } from '../styles/theme';
import type { StreamItemData } from '../components/StreamItem';

export interface SystemStats {
  cpu_percent: number;
  ram_gb: number;
  battery_percent: number;
  network: { in_mb: number; out_mb: number };
}

interface AssistantState {
  orbState: OrbState;
  transcript: string;
  response: string;
  streamItems: StreamItemData[];
  systemStats: SystemStats;
  inputMode: 'push-to-talk' | 'always-on';
  isMuted: boolean;
  waveformData: Float32Array;
  expandedSections: { activity: boolean };

  setOrbState: (s: OrbState) => void;
  setTranscript: (t: string) => void;
  setResponse: (r: string) => void;
  addStreamItem: (item: StreamItemData) => void;
  updateStreamItem: (id: string, updates: Partial<StreamItemData>) => void;
  clearStream: () => void;
  setSystemStats: (s: SystemStats) => void;
  setInputMode: (m: 'push-to-talk' | 'always-on') => void;
  toggleMute: () => void;
  setWaveformData: (d: Float32Array) => void;
  toggleSection: (s: 'activity') => void;
  reset: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  orbState: 'idle',
  transcript: '',
  response: '',
  streamItems: [],
  systemStats: { cpu_percent: 0, ram_gb: 0, battery_percent: -1, network: { in_mb: 0, out_mb: 0 } },
  inputMode: 'push-to-talk',
  isMuted: false,
  waveformData: new Float32Array(128),
  expandedSections: { activity: true },

  setOrbState: (orbState) => set({ orbState }),
  setTranscript: (transcript) => set({ transcript }),
  setResponse: (response) => set({ response }),
  addStreamItem: (item) => set((s) => ({ streamItems: [...s.streamItems.slice(-50), item] })),
  updateStreamItem: (id, updates) => set((s) => ({
    streamItems: s.streamItems.map((i) => (i.id === id ? { ...i, ...updates } : i)),
  })),
  clearStream: () => set({ streamItems: [] }),
  setSystemStats: (systemStats) => set({ systemStats }),
  setInputMode: (inputMode) => set({ inputMode }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  setWaveformData: (waveformData) => set({ waveformData }),
  toggleSection: (section) => set((s) => ({
    expandedSections: { ...s.expandedSections, [section]: !s.expandedSections[section] },
  })),
  reset: () => set({ orbState: 'idle', transcript: '', response: '', streamItems: [] }),
}));
