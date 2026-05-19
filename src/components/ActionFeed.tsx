import { motion, AnimatePresence } from 'framer-motion';
import { useAssistantStore } from '../stores/assistantStore';
import { fonts, colors } from '../styles/theme';

const statusIcon: Record<string, string> = {
  running: '\u27F3',
  done: '\u2713',
  error: '\u2717',
};

const statusColor: Record<string, string> = {
  running: colors.listening,
  done: colors.executing,
  error: colors.error,
};

export default function ActionFeed() {
  const actions = useAssistantStore((s) => s.actions);
  if (actions.length === 0) return null;

  return (
    <div
      style={{
        margin: '8px 20px 0',
        padding: '8px 12px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        maxHeight: '100px',
        overflow: 'auto',
      }}
      data-no-drag
    >
      <AnimatePresence>
        {actions.map((action) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '3px 0',
              fontFamily: fonts.mono,
              fontSize: '12px',
            }}
          >
            <span style={{ color: colors.textDim }}>
              {'\u25B8'} {action.label}
            </span>
            <span style={{ color: statusColor[action.status], fontWeight: 500 }}>
              {statusIcon[action.status]} {action.status}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
