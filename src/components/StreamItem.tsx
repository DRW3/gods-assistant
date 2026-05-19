import React from 'react';
import { palette, clay, fonts, radius } from '../styles/theme';

export interface StreamItemData {
  id: string;
  event: string;
  title: string;
  detail: string;
  status: 'running' | 'done' | 'error';
  elapsed?: string;
  bash_output?: { command: string; stdout: string; stderr: string };
  skill_name?: string;
  agent_id?: string;
  session_id?: string;
}

const ICONS: Record<string, { emoji: string; bg: string }> = {
  thinking: { emoji: '\u{1F9E0}', bg: 'linear-gradient(135deg, #b49cdb, #7e5fad)' },
  read: { emoji: '\u{1F4D6}', bg: `linear-gradient(135deg, ${palette.jade}, ${palette.jadeMuted})` },
  write: { emoji: '\u270D\uFE0F', bg: 'linear-gradient(135deg, #63b3ed, #3182ce)' },
  edit: { emoji: '\u270F\uFE0F', bg: `linear-gradient(135deg, ${palette.gold}, ${palette.goldMuted})` },
  bash: { emoji: '$_', bg: 'linear-gradient(135deg, #2a3a30, #1a2a20)' },
  glob: { emoji: '\u{1F50E}', bg: 'linear-gradient(135deg, #4fd1c5, #2c7a7b)' },
  grep: { emoji: '\u2295', bg: 'linear-gradient(135deg, #9f7aea, #6b46c1)' },
  search: { emoji: '\u{1F50D}', bg: 'linear-gradient(135deg, #48bb78, #276749)' },
  fetch: { emoji: '\u{1F310}', bg: 'linear-gradient(135deg, #4299e1, #2b6cb0)' },
  agent: { emoji: '\u{1F916}', bg: 'linear-gradient(135deg, #ed64a6, #b83280)' },
  skill: { emoji: '\u26A1', bg: 'linear-gradient(135deg, #f6ad55, #c05621)' },
  mcp: { emoji: '\u{1F50C}', bg: 'linear-gradient(135deg, #f687b3, #b83280)' },
  plan: { emoji: '\u{1F4CB}', bg: 'linear-gradient(135deg, #fbd38d, #c05621)' },
  done: { emoji: '\u2713', bg: `linear-gradient(135deg, ${palette.jade}, ${palette.jadeMuted})` },
  error: { emoji: '\u2717', bg: `linear-gradient(135deg, ${palette.danger}, #c04040)` },
  text: { emoji: '\u{1F4AC}', bg: 'linear-gradient(135deg, #718096, #4a5568)' },
};

export default function StreamItem({ item }: { item: StreamItemData }) {
  const icon = ICONS[item.event] || ICONS.text;
  const isRunning = item.status === 'running';

  return (
    <div style={{
      display: 'flex', gap: 8, padding: '6px 10px',
      background: `linear-gradient(145deg, ${palette.bgLight}, ${palette.bg})`,
      borderRadius: 12, boxShadow: clay.raisedSm,
      border: `1px solid ${isRunning ? 'rgba(107,203,155,0.1)' : palette.white02}`,
      fontFamily: fonts.mono, fontSize: 9,
      animation: isRunning ? 'pulse 3s ease-in-out infinite' : 'none',
    }}>
      {/* Icon badge */}
      <div style={{
        width: 22, height: 22, borderRadius: 8, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: item.event === 'bash' ? 9 : 10,
        flexShrink: 0, background: icon.bg, color: item.event === 'bash' ? palette.jade : 'white',
        boxShadow: '2px 2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.12)',
      }}>
        {icon.emoji}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: palette.text, fontWeight: 500, fontSize: 9, marginBottom: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
          {item.title}
          {item.skill_name && (
            <span style={{
              fontSize: 7, color: '#f6ad55', background: 'rgba(246,173,85,0.1)',
              border: '1px solid rgba(246,173,85,0.15)', borderRadius: 6, padding: '1px 6px',
            }}>{item.skill_name}</span>
          )}
        </div>
        <div style={{
          color: palette.textDim, fontSize: 8, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.detail}
        </div>

        {/* Bash inline output */}
        {item.bash_output && (
          <div style={{
            marginTop: 4, padding: '4px 6px', borderRadius: 6,
            background: `linear-gradient(145deg, ${palette.bgDark}, #08140c)`,
            boxShadow: clay.sunken, border: `1px solid ${palette.white02}`,
            fontSize: 8, lineHeight: 1.5, maxHeight: 55, overflowY: 'auto' as const,
          }}>
            <div style={{ color: palette.jade }}>
              <span style={{ opacity: 0.35 }}>{'\u276F'} </span>{item.bash_output.command}
            </div>
            {item.bash_output.stdout && (
              <div style={{ color: palette.success, paddingLeft: 10 }}>{item.bash_output.stdout}</div>
            )}
            {item.bash_output.stderr && (
              <div style={{ color: palette.danger, paddingLeft: 10 }}>{item.bash_output.stderr}</div>
            )}
          </div>
        )}
      </div>

      {/* Time */}
      <div style={{ color: palette.textMuted, fontSize: 7, flexShrink: 0, marginTop: 2 }}>
        {item.elapsed || (isRunning ? '...' : '')}
      </div>
    </div>
  );
}
