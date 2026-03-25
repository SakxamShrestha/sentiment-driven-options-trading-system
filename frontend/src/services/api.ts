import type {
  Account, Position, Order, Activity, Snapshot, Quote,
  Bar, SentimentResult, LunarCrushBuzz, PortfolioPoint,
} from '../types';

const BASE = '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(BASE + path, init);
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${r.status}`);
  }
  return r.json();
}

function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

export const api = {
  getAccount: () => get<Account>('/api/alpaca/account'),
  getPositions: () => get<Position[]>('/api/alpaca/positions'),
  getOrders: (status = 'all', limit = 50) =>
    get<Order[]>(`/api/alpaca/orders?status=${status}&limit=${limit}`),
  getActivities: (type = 'FILL') =>
    get<Activity[]>(`/api/alpaca/activities?type=${type}`),
  getSnapshot: (symbol: string) =>
    get<Snapshot>(`/api/alpaca/snapshot/${symbol}`),
  getQuote: (symbol: string) =>
    get<Quote>(`/api/alpaca/quote/${symbol}`),
  getBars: (symbol: string, timeframe: string, limit = 200) =>
    get<{ bars: Bar[] }>(`/api/alpaca/bars/${symbol}?timeframe=${timeframe}&limit=${limit}`),
  getPortfolioHistory: (period: string) =>
    get<{ period: string; base_value: number; points: PortfolioPoint[] }>(
      `/api/alpaca/portfolio-history?period=${period}`
    ),

  placeOrder: (body: {
    symbol: string; qty: number; side: string;
    type: string; time_in_force: string; limit_price?: number;
  }) => post<Order>('/api/alpaca/order', body),
  cancelOrder: (id: string) => del<{ cancelled: string }>(`/api/alpaca/order/${id}`),
  logTrade: (body: {
    order_id?: string; symbol: string; side: string;
    qty: number; price?: number | null;
  }) => post<{ ok: boolean }>('/api/log-trade', body),

  getSentiment: (ticker: string, limit = 12) =>
    get<SentimentResult>(`/api/sentiment/by_ticker?ticker=${encodeURIComponent(ticker)}&limit=${limit}`),
  getSentimentLlama: (ticker: string, limit = 6) =>
    get<SentimentResult>(`/api/sentiment/by_ticker_llama?ticker=${encodeURIComponent(ticker)}&limit=${limit}`),
  getLiveSentiment: () => get<Record<string, unknown>>('/api/live/sentiment'),
  getCircuitBreaker: () => get<{ tripped: boolean }>('/api/circuit-breaker'),
  setCircuitBreaker: (tripped: boolean) =>
    post<{ tripped: boolean; ok: boolean }>('/api/circuit-breaker', { tripped }),
  getLunarCrush: (symbol: string) =>
    get<LunarCrushBuzz>(`/api/lunarcrush/${encodeURIComponent(symbol)}`),
};
