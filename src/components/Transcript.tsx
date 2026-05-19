import { motion, AnimatePresence } from 'framer-motion';
import { useAssistantStore } from '../stores/assistantStore';
import { fonts, colors } from '../styles/theme';

export default function Transcript() {
  const transcript = useAssistantStore((s) => s.transcript);
  const response = useAssistantStore((s) => s.response);
  const orbState = useAssistantStore((s) => s.orbState);

  const displayText = response || transcript;
  if (!displayText) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={displayText}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        style={{
          padding: '10px 16px',
          margin: '0 20px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          fontFamily: fonts.mono,
          fontSize: '13px',
          lineHeight: '1.5',
          color: response ? colors.text : colors.textDim,
          textAlign: 'center',
          maxHeight: '80px',
          overflow: 'auto',
        }}
        data-no-drag
      >
        "{displayText}"
        {orbState === 'listening' && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            style={{ color: colors.listening }}
          >
            |
          </motion.span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
