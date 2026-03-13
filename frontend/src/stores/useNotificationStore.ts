import { create } from 'zustand';

export interface Notification {
  id: number;
  type: string;
  symbol: string | null;
  side: string | null;
  qty: number | null;
  price: number | null;
  message: string;
  read: number;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (n: Notification[]) => void;
  setUnreadCount: (c: number) => void;
  pushNotification: (n: Notification) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  pushNotification: (n) =>
    set((state) => ({
      notifications: [n, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),
}));
