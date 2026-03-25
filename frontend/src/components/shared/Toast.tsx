import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from '../../stores/useToastStore';

export function Toast() {
  const { message, type, visible } = useToastStore();

  const styles =
    type === 'success'
      ? 'bg-gain text-white shadow-lg shadow-gain/20'
      : type === 'error'
        ? 'bg-loss text-white shadow-lg shadow-loss/20'
        : 'bg-card border border-border text-text shadow-xl';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`fixed bottom-6 right-6 z-[9999] ${styles} px-5 py-3.5 rounded-sm text-sm font-mono max-w-xs`}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
