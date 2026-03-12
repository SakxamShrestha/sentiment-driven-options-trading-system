export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin ${className}`}
    />
  );
}
