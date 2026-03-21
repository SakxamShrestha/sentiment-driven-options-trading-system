const cards = [
  { title: 'Multi-Source News Ingestion', body: 'We aggregate news from Alpaca News, NewsAPI, StockTwits, Yahoo Finance RSS, and Finviz — giving you broad market coverage per ticker.' },
  { title: 'AI Sentiment Scoring', body: 'Each article is scored using FinBERT — a financial BERT model. Scores range from -1 (bearish) to +1 (bullish).' },
  { title: 'FinBERT vs Llama 3', body: 'Toggle between two AI models. FinBERT runs locally for fast inference. Llama 3 uses the Groq API for deeper language reasoning.' },
  { title: 'Trade Signals', body: 'When average sentiment crosses a threshold, the system suggests a BUY or SELL signal based on configurable rules.' },
  { title: 'Risk Circuit Breaker', body: 'A safety mechanism that pauses automated signals during extreme conditions. Toggle it from the Sentiment page.' },
  { title: 'Paper Trading', body: 'All trades use Alpaca\'s paper environment — no real money. Starting balance is $100,000 virtual USD.' },
  { title: 'Stock Detail', body: 'Search any ticker to open live candlestick charts, price data, position details, and an inline order form.' },
  { title: 'LunarCrush Buzz', body: 'Social sentiment metrics including Galaxy Score and social volume, powered by the LunarCrush API.' },
  { title: 'Backtester', body: 'Replays historical bars to simulate momentum-proxy strategy returns. Configure period, threshold, and position sizing.' },
];

export default function Learn() {
  return (
    <div className="max-w-[640px]">
      <h1 className="text-lg font-bold mb-1">How it works</h1>
      <p className="text-muted text-sm leading-relaxed mb-6">
        Real-time news analysis combined with AI sentiment scoring for informed paper trading.
      </p>
      <div className="flex flex-col gap-3">
        {cards.map((c, i) => (
          <div key={i} className="card-elevated px-5 py-4">
            <div className="text-sm font-semibold mb-1">{c.title}</div>
            <p className="text-muted text-[13px] leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
