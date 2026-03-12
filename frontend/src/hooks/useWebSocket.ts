import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { price$ } from '../stores/usePriceStore';
import { sentiment$ } from '../stores/useSentimentStore';

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

    return () => {
      s.disconnect();
    };
  }, []);
}
