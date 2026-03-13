import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

const saved = (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) as Theme | null;
const initial: Theme = saved === 'dark' ? 'dark' : 'light';

if (initial === 'dark') document.documentElement.classList.add('dark');

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initial,
  toggle: () =>
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', next === 'dark');
      localStorage.setItem('theme', next);
      return { theme: next };
    }),
  set: (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
    set({ theme });
  },
}));
