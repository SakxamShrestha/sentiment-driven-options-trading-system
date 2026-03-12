const cards = [
  { title: 'Multi-Source News Ingestion', body: 'We aggregate news from Alpaca News, NewsAPI, StockTwits, Yahoo Finance RSS, and Finviz — giving you broad market coverage per ticker.' },
  { title: 'AI Sentiment Scoring (FinBERT)', body: 'Each article is scored using FinBERT — a financial BERT model. Scores range from –1 (bearish) to +1 (bullish).' },
  { title: 'FinBERT vs Llama 3', body: 'Toggle between two AI models for sentiment scoring. FinBERT is a fast, locally-run financial BERT model. Llama 3 uses the Groq API for large-language-model reasoning (requires GROQ_API_KEY in .env).' },
  { title: 'Trade Signals', body: 'When average sentiment crosses a threshold (bullish > 0.6 or bearish < –0.6), the system suggests a BUY or SELL signal.' },
  { title: 'Risk Circuit Breaker', body: 'A safety mechanism that pauses automated signals when extreme market conditions are detected. Toggle it from the Sentiment page.' },
  { title: 'Paper Trading', body: 'All trades are in Alpaca\'s paper environment — no real money. Your starting balance is $100,000 virtual USD.' },
  { title: 'Stock Detail Page', body: 'Search any ticker in the top bar to open the stock detail view: live candlestick chart (1m / 5m / 1H / 1D), price, daily change, position, and inline buy/sell form.' },
  { title: 'LunarCrush Social Buzz', body: 'After running a Sentiment lookup, the Social Buzz card shows Galaxy Score and social volume from LunarCrush (requires LUNARCRUSH_API_KEY in .env).' },
  { title: 'Backtester', body: 'Replays historical OHLCV bars for any symbol to simulate what returns a momentum-proxy strategy would have achieved. Set the period, signal threshold, and per-trade notional, then click Run Backtest.' },
];

export default function Learn() {
  return (
    <div className="max-w-[680px]">
      <h2 className="text-lg font-bold mb-2">How TradeSent.AI Works</h2>
      <p className="text-muted text-sm leading-relaxed mb-5">
        TradeSent.AI combines real-time financial news with AI sentiment analysis to help you make informed paper trading decisions.
      </p>
      <div className="flex flex-col gap-3.5">
        {cards.map((c, i) => (
          <div key={i} className="border border-border rounded-xl px-4 py-3.5">
            <div className="text-sm font-semibold mb-1.5">{c.title}</div>
            <p className="text-muted text-[13px] leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
