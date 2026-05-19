import { useRef, useEffect } from 'react';
import { useAssistantStore } from '../stores/assistantStore';
import { palette, fonts } from '../styles/theme';
import StreamItem from './StreamItem';

export default function ActivityStream() {
  const items = useAssistantStore((s) => s.streamItems);
  const expanded = useAssistantStore((s) => s.expandedSections.activity);
  const toggle = useAssistantStore((s) => s.toggleSection);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [items]);

  if (items.length === 0) return null;

  const doneCount = items.filter((i) => i.status === 'done').length;

  return (
    <div data-no-drag>
      <div onClick={() => toggle('activity')} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 20px', cursor: 'pointer',
      }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 8, color: palette.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
          {expanded ? '\u25BE' : '\u25B8'} Activity
        </span>
        <span style={{
          fontFamily: fonts.mono, fontSize: 7, color: palette.jade,
          background: 'rgba(107,203,155,0.12)', borderRadius: 6, padding: '2px 6px',
        }}>{items.length} steps</span>
      </div>
      {expanded && (
        <div ref={scrollRef} style={{
          padding: '0 14px 10px', display: 'flex', flexDirection: 'column', gap: 3,
          maxHeight: 300, overflowY: 'auto' as const,
        }}>
          {items.map((item) => <StreamItem key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
