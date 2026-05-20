import ReactMarkdown from 'react-markdown';
import { palette, clay, fonts, radius } from '../styles/theme';

const codeStyle: React.CSSProperties = {
  background: 'rgba(107,203,155,0.08)',
  color: palette.jade,
  fontFamily: fonts.mono,
  fontSize: 11,
  padding: '2px 6px',
  borderRadius: 4,
};

const codeBlockStyle: React.CSSProperties = {
  background: `linear-gradient(145deg, ${palette.bgDark}, #08140c)`,
  boxShadow: clay.sunken,
  border: `1px solid ${palette.white02}`,
  borderRadius: 10,
  padding: '12px 14px',
  fontFamily: fonts.mono,
  fontSize: 11,
  lineHeight: 1.6,
  overflowX: 'auto',
  color: palette.jade,
  margin: '8px 0',
};

export default function ResponseCard({ transcript, response }: { transcript: string; response: string }) {
  if (!transcript && !response) return null;

  return (
    <div style={{ padding: '6px 20px 10px' }}>
      <div style={{
        background: `linear-gradient(145deg, ${palette.bgLight}ee, ${palette.bg})`,
        borderRadius: radius.card,
        boxShadow: clay.raised,
        border: `1px solid ${palette.white02}`,
        padding: '14px 18px',
      }}>
        {/* User's question */}
        {transcript && (
          <div style={{
            fontSize: 11, color: palette.textDim, fontFamily: fonts.mono,
            lineHeight: 1.5, marginBottom: response ? 8 : 0,
            paddingBottom: response ? 8 : 0,
            borderBottom: response ? `1px solid ${palette.white04}` : 'none',
            fontStyle: 'italic',
          }}>
            "{transcript}"
          </div>
        )}

        {/* Claude's response — rendered as markdown */}
        {response && (
          <div data-no-drag style={{ fontSize: 12.5, color: palette.text, lineHeight: 1.75 }}>
            <ReactMarkdown
              components={{
                // Headers
                h1: ({ children }) => (
                  <div style={{ fontSize: 16, fontWeight: 700, color: palette.text, margin: '12px 0 6px', letterSpacing: 0.3 }}>{children}</div>
                ),
                h2: ({ children }) => (
                  <div style={{ fontSize: 14, fontWeight: 700, color: palette.text, margin: '10px 0 5px', letterSpacing: 0.2 }}>{children}</div>
                ),
                h3: ({ children }) => (
                  <div style={{ fontSize: 13, fontWeight: 600, color: palette.jade, margin: '8px 0 4px' }}>{children}</div>
                ),

                // Bold
                strong: ({ children }) => (
                  <strong style={{ color: palette.jade, fontWeight: 600 }}>{children}</strong>
                ),

                // Italic
                em: ({ children }) => (
                  <em style={{ color: palette.textDim, fontStyle: 'italic' }}>{children}</em>
                ),

                // Inline code
                code: ({ children, className }) => {
                  const isBlock = className?.includes('language-');
                  if (isBlock) {
                    return <code style={{ fontFamily: fonts.mono, fontSize: 11 }}>{children}</code>;
                  }
                  return <code style={codeStyle}>{children}</code>;
                },

                // Code blocks
                pre: ({ children }) => (
                  <pre style={codeBlockStyle}>{children}</pre>
                ),

                // Lists
                ul: ({ children }) => (
                  <ul style={{ paddingLeft: 18, margin: '6px 0', listStyleType: 'none' }}>{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol style={{ paddingLeft: 18, margin: '6px 0' }}>{children}</ol>
                ),
                li: ({ children }) => (
                  <li style={{ marginBottom: 4, position: 'relative', paddingLeft: 12 }}>
                    <span style={{ position: 'absolute', left: 0, color: palette.jade, fontWeight: 600 }}>›</span>
                    {children}
                  </li>
                ),

                // Blockquotes
                blockquote: ({ children }) => (
                  <blockquote style={{
                    borderLeft: `3px solid ${palette.jade}40`,
                    paddingLeft: 12,
                    margin: '8px 0',
                    color: palette.textDim,
                    fontStyle: 'italic',
                    fontSize: 12,
                  }}>{children}</blockquote>
                ),

                // Paragraphs
                p: ({ children }) => (
                  <p style={{ margin: '6px 0', lineHeight: 1.75 }}>{children}</p>
                ),

                // Links
                a: ({ href, children }) => (
                  <a href={href} style={{ color: palette.jade, textDecoration: 'underline', textDecorationColor: `${palette.jade}40` }} target="_blank" rel="noopener noreferrer">{children}</a>
                ),

                // Horizontal rules
                hr: () => (
                  <hr style={{ border: 'none', borderTop: `1px solid ${palette.white08}`, margin: '10px 0' }} />
                ),

                // Tables
                table: ({ children }) => (
                  <div style={{ overflowX: 'auto', margin: '8px 0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fonts.mono, fontSize: 10 }}>{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead style={{ borderBottom: `2px solid ${palette.jade}30` }}>{children}</thead>
                ),
                th: ({ children }) => (
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: palette.jade, fontWeight: 600, fontSize: 10 }}>{children}</th>
                ),
                td: ({ children }) => (
                  <td style={{ padding: '5px 8px', borderBottom: `1px solid ${palette.white04}`, fontSize: 10, color: palette.textDim }}>{children}</td>
                ),
              }}
            >
              {response}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
