import { useRef, useEffect, useState, memo } from 'react';
import { motion } from 'framer-motion';

interface Props {
  value: number;
  className?: string;
}

export const PriceFlash = memo(function PriceFlash({ value, className = '' }: Props) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (value > prev.current) setFlash('up');
    else if (value < prev.current) setFlash('down');
    prev.current = value;
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <motion.span
      animate={{
        color: flash === 'up' ? '#16a34a' : flash === 'down' ? '#dc2626' : '#111827',
      }}
      transition={{ duration: 0.6 }}
      className={`font-bold tabular-nums ${className}`}
    >
      ${value.toFixed(2)}
    </motion.span>
  );
});
