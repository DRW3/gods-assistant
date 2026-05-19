export const colors = {
  idle: { orb: '#334155', accent: '#475569', glow: 'rgba(100,116,139,0.2)', text: 'rgba(255,255,255,0.25)', dot: 'rgba(255,255,255,0.15)', bar: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.04)' },
  listening: { orb: '#0ea5e9', accent: '#22d3ee', glow: 'rgba(34,211,238,0.4)', text: 'rgba(34,211,238,0.6)', dot: '#22d3ee', bar: '#22d3ee', border: 'rgba(34,211,238,0.06)' },
  processing: { orb: '#f59e0b', accent: '#fbbf24', glow: 'rgba(245,158,11,0.4)', text: 'rgba(245,158,11,0.6)', dot: '#f59e0b', bar: '#f59e0b', border: 'rgba(245,158,11,0.06)' },
  speaking: { orb: '#a855f7', accent: '#c084fc', glow: 'rgba(168,85,247,0.4)', text: 'rgba(168,85,247,0.6)', dot: '#a855f7', bar: '#a855f7', border: 'rgba(168,85,247,0.06)' },
  executing: { orb: '#0ea5e9', accent: '#22d3ee', glow: 'rgba(34,211,238,0.4)', text: 'rgba(34,211,238,0.6)', dot: '#22d3ee', bar: '#22d3ee', border: 'rgba(34,211,238,0.06)' },
  error: { orb: '#ef4444', accent: '#f87171', glow: 'rgba(239,68,68,0.4)', text: 'rgba(239,68,68,0.6)', dot: '#ef4444', bar: '#ef4444', border: 'rgba(239,68,68,0.06)' },

  panel: 'rgba(8, 10, 18, 0.94)',
  border: 'rgba(255, 255, 255, 0.05)',
  text: '#f1f5f9',
  textDim: 'rgba(255, 255, 255, 0.45)',
  textMuted: 'rgba(255, 255, 255, 0.2)',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
} as const;

export const fonts = {
  mono: "'JetBrains Mono', 'SF Mono', monospace",
  sans: "'Inter', -apple-system, sans-serif",
} as const;

export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking' | 'executing' | 'error';

export function stateColors(state: OrbState) {
  return colors[state];
}
