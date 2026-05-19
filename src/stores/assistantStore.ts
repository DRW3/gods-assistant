import { create } from 'zustand';
import type { OrbState } from '../styles/theme';

export interface Task {
  id: string;
  name: string;
  status: 'done' | 'running' | 'pending' | 'error';
  detail: string;
  time: string;
}

export interface TerminalLine {
  type: 'cmd' | 'output';
  text: string;
  status?: 'ok' | 'error';
}

export interface ProcessInfo {
  name: string;
  pid: number;
  mem_mb: number;
  port: string;
  status: 'alive' | 'warning' | 'dead' | 'idle';
}

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
  tasks: Task[];
  terminalLines: TerminalLine[];
  processes: ProcessInfo[];
  systemStats: SystemStats;
  inputMode: 'push-to-talk' | 'always-on';
  isMuted: boolean;
  waveformData: Float32Array;
  expandedSections: { tasks: boolean; terminal: boolean; processes: boolean };

  setOrbState: (s: OrbState) => void;
  setTranscript: (t: string) => void;
  setResponse: (r: string) => void;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  addTerminalLine: (line: TerminalLine) => void;
  clearTerminal: () => void;
  setProcesses: (p: ProcessInfo[]) => void;
  setSystemStats: (s: SystemStats) => void;
  setInputMode: (m: 'push-to-talk' | 'always-on') => void;
  toggleMute: () => void;
  setWaveformData: (d: Float32Array) => void;
  toggleSection: (s: 'tasks' | 'terminal' | 'processes') => void;
  reset: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  orbState: 'idle',
  transcript: '',
  response: '',
  tasks: [],
  terminalLines: [],
  processes: [],
  systemStats: { cpu_percent: 0, ram_gb: 0, battery_percent: -1, network: { in_mb: 0, out_mb: 0 } },
  inputMode: 'push-to-talk',
  isMuted: false,
  waveformData: new Float32Array(128),
  expandedSections: { tasks: true, terminal: true, processes: false },

  setOrbState: (orbState) => set({ orbState }),
  setTranscript: (transcript) => set({ transcript }),
  setResponse: (response) => set({ response }),
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  updateTask: (id, updates) => set((s) => ({
    tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })),
  addTerminalLine: (line) => set((s) => ({ terminalLines: [...s.terminalLines.slice(-50), line] })),
  clearTerminal: () => set({ terminalLines: [] }),
  setProcesses: (processes) => set({ processes }),
  setSystemStats: (systemStats) => set({ systemStats }),
  setInputMode: (inputMode) => set({ inputMode }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  setWaveformData: (waveformData) => set({ waveformData }),
  toggleSection: (section) => set((s) => ({
    expandedSections: { ...s.expandedSections, [section]: !s.expandedSections[section] },
  })),
  reset: () => set({
    orbState: 'idle', transcript: '', response: '', tasks: [], terminalLines: [],
  }),
}));
