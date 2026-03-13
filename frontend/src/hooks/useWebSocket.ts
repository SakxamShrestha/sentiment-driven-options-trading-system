import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { price$ } from '../stores/usePriceStore';
import { sentiment$ } from '../stores/useSentimentStore';
import { useNotificationStore } from '../stores/useNotificationStore';

export function useWebSocket() {
  const socket = useRef<Socket | null>(null);

  useEffect(() => {
    socket.current = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
    });

    const s = socket.current;

    s.on('connect', () => console.log('[WS] connected'));
    s.on('disconnect', () => console.log('[WS] disconnected'));

    s.on('price_update', (data) => {
      price$.next({
        symbol: data.symbol,
        price: data.price,
        change: data.change ?? 0,
        changePct: data.change_pct ?? 0,
        timestamp: Date.now(),
      });
    });

    s.on('sentiment_update', (data) => {
      sentiment$.next({
        score: data.score,
        signal_side: data.signal_side,
        model_used: data.model_used,
        headline: data.headline,
      });
    });

    s.on('notification', (data) => {
      useNotificationStore.getState().pushNotification({
        id: data.id,
        type: data.type,
        symbol: data.symbol,
        side: data.side,
        qty: data.qty,
        price: data.price,
        message: data.message,
        read: 0,
        created_at: new Date().toISOString(),
      });
    });

    return () => {
      s.disconnect();
    };
  }, []);
}
