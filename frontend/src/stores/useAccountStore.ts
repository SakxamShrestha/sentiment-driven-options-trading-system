import { create } from 'zustand';
import type { Account, Position } from '../types';

interface AccountState {
  account: Account | null;
  positions: Position[];
  setAccount: (a: Account) => void;
  setPositions: (p: Position[]) => void;
}

export const useAccountStore = create<AccountState>((set) => ({
  account: null,
  positions: [],
  setAccount: (account) => set({ account }),
  setPositions: (positions) => set({ positions }),
}));
