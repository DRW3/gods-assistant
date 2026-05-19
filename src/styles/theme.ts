export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking' | 'executing' | 'error';

export const palette = {
  bg: '#14261c',
  bgLight: '#1a2e22',
  bgDark: '#0a1810',
  jade: '#6bcb9b',
  jadeMuted: '#2d9b6a',
  jadeDim: 'rgba(107,203,155,0.15)',
  gold: '#f0c060',
  goldMuted: '#d4a030',
  text: '#c8f0d8',
  textDim: 'rgba(200,240,216,0.5)',
  textMuted: 'rgba(200,240,216,0.25)',
  success: '#6ee7b7',
  warning: '#f0c060',
  danger: '#f07060',
  white08: 'rgba(255,255,255,0.08)',
  white04: 'rgba(255,255,255,0.04)',
  white02: 'rgba(255,255,255,0.02)',
  black30: 'rgba(0,0,0,0.3)',
  black45: 'rgba(0,0,0,0.45)',
} as const;

export const clay = {
  raised: '10px 10px 24px rgba(0,0,0,0.5), inset -6px -6px 12px rgba(0,0,0,0.25), inset 6px 6px 12px rgba(255,255,255,0.05)',
  raisedSm: '4px 4px 10px rgba(0,0,0,0.4), inset -3px -3px 6px rgba(0,0,0,0.2), inset 3px 3px 6px rgba(255,255,255,0.06)',
  sunken: 'inset 4px 4px 10px rgba(0,0,0,0.45), inset -2px -2px 5px rgba(255,255,255,0.02)',
  button: '3px 3px 8px rgba(0,0,0,0.35), inset -2px -2px 4px rgba(0,0,0,0.2), inset 2px 2px 4px rgba(255,255,255,0.15)',
  orb: '4px 4px 10px rgba(0,0,0,0.4), inset -3px -3px 6px rgba(0,0,0,0.25), inset 3px 3px 6px rgba(255,255,255,0.18)',
  overlay: '12px 12px 28px rgba(0,0,0,0.55), inset -6px -6px 14px rgba(0,0,0,0.3), inset 6px 6px 14px rgba(255,255,255,0.05)',
} as const;

export const fonts = {
  mono: "'Geist Mono', 'JetBrains Mono', 'SF Mono', monospace",
  sans: "'Outfit', 'Plus Jakarta Sans', -apple-system, sans-serif",
} as const;

export const radius = {
  overlay: 32,
  card: 22,
  pill: 20,
  button: 14,
  orb: '50%',
  terminal: 18,
  agent: 14,
} as const;

const orbColors: Record<OrbState, { from: string; to: string }> = {
  idle: { from: '#4a7a60', to: '#2d5a42' },
  listening: { from: '#6bcb9b', to: '#2d9b6a' },
  processing: { from: '#f0c060', to: '#d4a030' },
  speaking: { from: '#b49cdb', to: '#7e5fad' },
  executing: { from: '#6bcb9b', to: '#2d9b6a' },
  error: { from: '#f07060', to: '#c44030' },
};

export function orbGradient(state: OrbState): string {
  const c = orbColors[state];
  return `linear-gradient(135deg, ${c.from}, ${c.to})`;
}

export function orbGlow(state: OrbState): string {
  const c = orbColors[state];
  return `0 0 12px ${c.from}40`;
}
