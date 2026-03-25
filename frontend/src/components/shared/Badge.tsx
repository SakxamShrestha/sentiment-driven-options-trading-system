import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant: 'gain' | 'loss' | 'neutral';
  className?: string;
}

const styles = {
  gain: 'bg-gain-soft text-gain',
  loss: 'bg-loss-soft text-loss',
  neutral: 'bg-hover text-muted',
};

export const Badge = React.memo(function Badge({ children, variant, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-semibold font-mono ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
});
