import { useRef, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface Column<T> {
  header: string;
  accessor: (row: T, idx: number) => ReactNode;
  className?: string;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  maxHeight?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function VirtualTable<T>({
  data, columns, rowHeight = 48, maxHeight = 400,
  emptyMessage = 'No data', onRowClick,
}: Props<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  if (!data.length) {
    return <div className="text-center py-8 text-muted text-sm">{emptyMessage}</div>;
  }

  return (
    <div>
      <div className="grid text-[10px] font-mono font-semibold text-muted uppercase tracking-widest border-b border-border"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
        {columns.map((c, i) => (
          <div key={i} className={`px-4 py-3 ${c.className ?? ''}`}>{c.header}</div>
        ))}
      </div>
      <div ref={parentRef} style={{ maxHeight, overflow: 'auto' }}>
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const row = data[vi.index];
            return (
              <div
                key={vi.key}
                className={`absolute w-full grid items-center border-b border-border text-sm hover:bg-hover transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                style={{
                  height: vi.size,
                  transform: `translateY(${vi.start}px)`,
                  gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
                }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((c, ci) => (
                  <div key={ci} className={`px-4 truncate ${c.className ?? ''}`}>
                    {c.accessor(row, vi.index)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
