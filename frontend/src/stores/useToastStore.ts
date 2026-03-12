import { create } from 'zustand';

interface ToastState {
  message: string;
  type: '' | 'success' | 'error';
  visible: boolean;
  show: (message: string, type?: '' | 'success' | 'error') => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: '',
  type: '',
  visible: false,
  show: (message, type = '') => {
    set({ message, type, visible: true });
    setTimeout(() => set({ visible: false }), 4000);
  },
  hide: () => set({ visible: false }),
}));
