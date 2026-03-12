import { create } from 'zustand';
import { Subject } from 'rxjs';
import { bufferTime, filter } from 'rxjs/operators';
import type { PriceUpdate } from '../types';

interface PriceState {
  prices: Record<string, PriceUpdate>;
}

export const price$ = new Subject<PriceUpdate>();

export const usePriceStore = create<PriceState>((set) => {
  price$
    .pipe(
      bufferTime(100),
      filter((batch) => batch.length > 0)
    )
    .subscribe((batch) => {
      set((state) => {
        const next = { ...state.prices };
        for (const tick of batch) {
          next[tick.symbol] = tick;
        }
        return { prices: next };
      });
    });

  return { prices: {} };
});
