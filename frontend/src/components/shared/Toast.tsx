import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from '../../stores/useToastStore';

export function Toast() {
  const { message, type, visible } = useToastStore();

  const bgClass =
    type === 'success' ? 'bg-gain' : type === 'error' ? 'bg-loss' : 'bg-gray-800';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className={`fixed bottom-6 right-6 z-[9999] ${bgClass} text-white px-5 py-3 rounded-xl text-sm shadow-lg max-w-xs`}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
