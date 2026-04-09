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

export interface CompositeArticle {
  article_id: string;
  headline: string;
  summary?: string;
  url?: string;
  source: string;
  score: number;
  confidence: number;
  catalysts: string[];
  impact_horizon: 'short-term' | 'medium-term' | 'long-term';
  reasoning: string;
  model_used: string;
  created_at: string | null;
}

export interface CompositeSentimentResult {
  ticker: string;
  composite_score: number | null;
  news_score: number | null;
  social_score: number | null;
  confidence: number;
  all_catalysts: string[];
  dominant_horizon: string | null;
  article_count: number;
  articles: CompositeArticle[];
  model_used: string;
  lunarcrush_available: boolean;
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

export interface PortfolioPoint {
  t: number;
  v: number;
  pct: number;
}

export interface LearnLesson {
  id: number;
  title: string;
  emoji: string;
  icon_bg: string;
  duration: string;
  quiz_count: number;
  completed?: boolean;
  best_score?: number | null;
  attempts?: number;
}

export interface LearnQuestion {
  id: number;
  lesson_id: number;
  question_order: number;
  question: string;
  options: [string, string, string, string];
  correct_index: number;
  explanation: string;
}

export interface LearnProgress {
  lesson_id: number;
  best_score: number;
  total: number;
  attempts: number;
  completed_at: string;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  timestamp: number;
}
