import { create } from 'zustand';
import { Subject } from 'rxjs';

export interface LiveSentiment {
  score: number;
  signal_side?: string;
  model_used?: string;
  headline?: string;
}

interface SentimentState {
  cbTripped: boolean;
  liveSentiment: LiveSentiment | null;
  setCbTripped: (v: boolean) => void;
  setLiveSentiment: (s: LiveSentiment) => void;
}

export const sentiment$ = new Subject<LiveSentiment>();

export const useSentimentStore = create<SentimentState>((set) => {
  sentiment$.subscribe((data) => set({ liveSentiment: data }));

  return {
    cbTripped: false,
    liveSentiment: null,
    setCbTripped: (cbTripped) => set({ cbTripped }),
    setLiveSentiment: (liveSentiment) => set({ liveSentiment }),
  };
});
