import { useEffect, useRef, useState, memo } from 'react';

interface Props {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  duration?: number;
}

export const AnimatedNumber = memo(function AnimatedNumber({
  value, prefix = '', suffix = '', decimals = 2, className = '', duration = 400,
}: Props) {
  const [display, setDisplay] = useState(value);
  const raf = useRef<number>(0);
  const start = useRef(display);
  const startTime = useRef(0);

  useEffect(() => {
    start.current = display;
    startTime.current = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start.current + (value - start.current) * eased);
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    }

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}{display.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}{suffix}
    </span>
  );
});
