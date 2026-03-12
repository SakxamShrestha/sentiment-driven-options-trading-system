export interface Account {
  id: string;
  account_number: string;
  equity: string;
  cash: string;
  buying_power: string;
  regt_buying_power: string;
  daytrading_buying_power: string;
  options_buying_power: string;
  long_market_value: string;
  short_market_value: string;
  initial_margin: string;
  maintenance_margin: string;
  last_equity: string;
  accrued_fees: string;
  status: string;
}

export interface Position {
  symbol: string;
  qty: string;
  side: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
}

export interface Order {
  id: string;
  symbol: string;
  side: string;
  type: string;
  qty: string;
  notional: string | null;
  filled_qty: string;
  filled_avg_price: string | null;
  status: string;
  submitted_at: string;
  filled_at: string | null;
  time_in_force: string;
}

export interface Activity {
  activity_type: string;
  symbol?: string;
  side?: string;
  qty?: string;
  price?: string;
  net_amount?: string;
  transaction_time?: string;
  date?: string;
}

export interface Bar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface Snapshot {
  symbol: string;
  price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  change: number | null;
  change_pct: number | null;
  timestamp: string | null;
  error?: string;
}

export interface Quote {
  symbol: string;
  bid: number | null;
  ask: number | null;
  bid_size: number | null;
  ask_size: number | null;
}

export interface SentimentArticle {
  article_id: string;
  headline: string;
  summary?: string;
  url?: string;
  source: string;
  score: number;
  model_used: string;
  created_at: string | null;
}

export interface SentimentResult {
  ticker: string;
  count: number;
  average_score: number | null;
  articles: SentimentArticle[];
  model?: string;
}

export interface LunarCrushBuzz {
  symbol: string;
  available: boolean;
  metrics?: {
    galaxy_score?: number;
    social_volume?: number;
    social_score?: number;
    sentiment?: number;
    market_dominance?: number;
  };
}

export interface BacktestTrade {
  symbol: string;
  entry_time: string;
  exit_time: string;
  shares: number;
  entry_price: number;
  exit_price: number;
  pnl: number;
  pnl_pct: number;
  bars_held: number;
  exit_reason: string;
}

export interface BacktestResult {
  symbol: string;
  period: string;
  bars_count: number;
  trades: BacktestTrade[];
  trade_count: number;
  total_return_pct: number;
  win_rate: number;
  max_drawdown_pct: number;
  final_equity: number;
  starting_equity: number;
  error?: string;
}

export interface PortfolioPoint {
  t: number;
  v: number;
  pct: number;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  timestamp: number;
}
