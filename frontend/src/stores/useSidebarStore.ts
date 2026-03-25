import { create } from 'zustand';

const saved =
  typeof localStorage !== 'undefined' &&
  localStorage.getItem('sidebar-collapsed') === 'true';

interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleCollapse: () => void;
  toggleMobile: () => void;
  closeMobile: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: saved,
  isMobileOpen: false,
  toggleCollapse: () =>
    set((s) => {
      const next = !s.isCollapsed;
      localStorage.setItem('sidebar-collapsed', String(next));
      return { isCollapsed: next };
    }),
  toggleMobile: () => set((s) => ({ isMobileOpen: !s.isMobileOpen })),
  closeMobile: () => set({ isMobileOpen: false }),
}));
