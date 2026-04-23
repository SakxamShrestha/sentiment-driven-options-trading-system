export const STARTING_EQUITY = 100_000;

export const TIMEFRAMES = ['1Min', '5Min', '1Hour', '1Day'] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '1Min': '1m',
  '5Min': '5m',
  '1Hour': '1H',
  '1Day': '1D',
};

export const PORTFOLIO_PERIODS = ['1D', '1W', '1M', '3M', '1Y'] as const;
export type PortfolioPeriod = (typeof PORTFOLIO_PERIODS)[number];

