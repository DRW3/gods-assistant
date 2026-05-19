export const colors = {
  idle: '#0A1628',
  listening: '#00F0FF',
  processing: '#FFB800',
  speaking: '#A855F7',
  executing: '#10B981',
  error: '#EF4444',
  panel: 'rgba(10, 15, 30, 0.75)',
  border: 'rgba(255, 255, 255, 0.08)',
  text: '#E2E8F0',
  textDim: '#94A3B8',
} as const;

export const fonts = {
  mono: "'JetBrains Mono', 'SF Mono', monospace",
  sans: "'Inter', -apple-system, sans-serif",
} as const;

export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking' | 'executing' | 'error';

export function orbColor(state: OrbState): string {
  return colors[state];
}
