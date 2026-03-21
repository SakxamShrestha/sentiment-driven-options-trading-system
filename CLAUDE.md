# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TradeSent.AI** — AI-powered paper trading simulator with real-time sentiment analysis. Paper trades via Alpaca ($100K virtual USD), scores news via FinBERT/Llama 3, visualizes candlestick charts, and runs momentum backtests. Built for CSCI 411/412 Senior Seminar.

## Development Commands

### Backend (Python/Flask)
```bash
# Required: start Redis first
redis-server

# Run the Flask + SocketIO server (port 5001)
python main.py

# Run tests
python -m pytest tests/
python -m pytest tests/test_sentiment.py  # single test file
```

### Frontend (React/TypeScript/Vite)
```bash
cd frontend

npm install          # install dependencies
npm run dev          # start Vite dev server (port 5173, proxies /api → localhost:5001)
npm run build        # TypeScript check + Vite build → ../static/dist
npm run lint         # ESLint
npm run preview      # preview production build
```

### Environment Setup
Copy `.env.example` to `.env` and populate:
- **Backend:** `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, `ALPACA_BASE_URL`
- **Backend:** `GROQ_API_KEY` (Llama 3), or FinBERT runs locally via `transformers`
- **Backend optional:** `LUNARCRUSH_API_KEY`, `NEWSAPI_API_KEY`, `REDIS_HOST/PORT`
- **Frontend:** Firebase config must be provided as `VITE_FIREBASE_*` env vars (see below)

Firebase environment variables required in `frontend/.env`:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```
Firebase config is loaded in `frontend/src/services/firebase.ts` via `import.meta.env`.

## Architecture

### Two-Process Dev Setup
The Vite dev server (`:5173`) proxies all `/api/*` and `/socket.io` traffic to Flask (`:5001`). In production, Flask serves the Vite build from `static/dist/` and handles all routes via a catch-all returning `index.html`.

### Backend (Flask + SocketIO)
```
main.py                    # Entry point: registers blueprints, starts news pipeline, runs SocketIO
api/routes/dashboard.py    # /api/* — sentiment, trades, circuit breaker, LunarCrush
api/routes/trading.py      # /api/alpaca/* — account, positions, orders, bars, backtest
services/pipeline.py       # Orchestrator: news → sentiment → trade signal → persist
services/intelligence/     # SentimentEngine (FinBERT + Llama 3), TradeSignalService, CircuitBreaker
services/data_ingestion/   # Alpaca News, NewsAPI, LunarCrush, Twitter, Reddit, Finviz
services/backtesting/      # Momentum strategy simulator
config/settings.py         # Loads all config from .env via python-dotenv
db/                        # Redis (live state) + SQLite (persistent trades/sentiment)
```

### Frontend (React 19 + TypeScript + Vite)
```
frontend/src/
  main.tsx                   # React root
  App.tsx                    # BrowserRouter, QueryClient, auth state listener, route tree
  services/
    api.ts                   # All HTTP calls to the Flask backend (relative URLs via proxy)
    firebase.ts              # Firebase init + auth helpers (Google, email/password)
  routes/
    Landing.tsx              # Public login/signup page (full-screen, no Navbar)
    Home.tsx                 # Dashboard with portfolio area chart + quick stats
    StockDetail.tsx          # Candlestick chart, order form, live price
    Positions.tsx            # Open positions table
    Orders.tsx               # Order history
    Activities.tsx           # Account activity feed
    Balances.tsx             # Cash + portfolio balance
    Sentiment.tsx            # FinBERT / Llama 3 sentiment feed
    Backtest.tsx             # Momentum backtest runner
    Learn.tsx                # Educational content
    Profile.tsx              # User profile + theme toggle + sign out
    Notifications.tsx        # Full notifications page
  components/
    auth/
      ProtectedRoute.tsx     # Redirects unauthenticated users to /login; shows Spinner while loading
    layout/
      Sidebar.tsx            # Exports Navbar — top horizontal navigation bar (not a sidebar)
      RightPanel.tsx         # Right-side positions panel with mini sparklines (home route only)
    charts/
      CandlestickChart.tsx   # TradingView Lightweight Charts v5
      PortfolioAreaChart.tsx # Area chart for portfolio equity curve
    trading/
      OrderForm.tsx          # Buy/sell form on StockDetail
    shared/
      Badge.tsx              # Status/sentiment badge
      Toast.tsx              # Global toast notifications
      NotificationDropdown.tsx # Bell icon with live notification count in Navbar
      Spinner.tsx            # Loading spinner
      PriceFlash.tsx         # Green/red flash on price change
      AnimatedNumber.tsx     # Smooth number transitions
      VirtualTable.tsx       # Virtualized table for long lists
  hooks/
    useWebSocket.ts          # Socket.io connection — feeds price$, sentiment$, notifications
  stores/
    useAuthStore.ts          # Zustand: Firebase User + loading state
    useThemeStore.ts         # Zustand: light/dark theme, persisted to localStorage
    useAccountStore.ts       # Zustand: positions list (used by RightPanel)
    usePriceStore.ts         # RxJS BehaviorSubject (price$) for live price streaming
    useSentimentStore.ts     # RxJS BehaviorSubject (sentiment$) for live sentiment events
    useToastStore.ts         # Zustand: toast queue
    useNotificationStore.ts  # Zustand: notification list + unread count
  lib/
    formatters.ts            # Number/currency/date formatting helpers
    constants.ts             # Shared constants
  types/
    index.ts                 # Shared TypeScript interfaces (Position, Order, etc.)
```

### App Shell Structure
`App.tsx` defines two top-level layouts:

1. **Public layout** — `<Landing />` at `/login` (full-screen, no Navbar, animated gradient background with glassmorphism auth card)
2. **Protected layout** — `<DashboardLayout>` wraps all other routes behind `<ProtectedRoute>`. DashboardLayout renders `<Navbar>` at the top, the page content in a scrollable main area, and `<RightPanel>` alongside on the Home route only.

`AppContent` (inside `BrowserRouter`) sets up the Firebase `onAuthStateChanged` listener once at mount and populates `useAuthStore`.

### Auth Flow
- Firebase supports **Google Sign-In (popup)** and **email/password (sign in + register)** — both handled in `Landing.tsx`
- `firebase.ts` exports: `loginWithGoogle`, `loginWithEmail`, `registerWithEmail`, `logout`, `onAuthStateChanged`, `auth`, `User`
- `ProtectedRoute` checks `useAuthStore` — shows `Spinner` while loading, redirects to `/login` if unauthenticated
- Already-authenticated users who visit `/login` are immediately redirected to `/` via `<Navigate>`

### Data Flow
1. **News pipeline:** Alpaca News WebSocket → `NewsPipeline` → FinBERT/Llama scoring → Redis cache + SQLite
2. **REST queries:** React Query (TanStack v5) fetches via `services/api.ts` → Flask → Alpaca API or Redis/SQLite
3. **Real-time:** Flask emits Socket.io events → `useWebSocket` hook → RxJS subjects (`price$`, `sentiment$`) → component subscriptions
4. **Auth:** Firebase `onAuthStateChanged` → `useAuthStore` → `ProtectedRoute` guards all routes except `/login`

### State Management
- **Server state:** React Query (TanStack Query v5) — staleTime 5s, refetchOnWindowFocus off
- **Auth state:** Zustand `useAuthStore`
- **Theme:** Zustand `useThemeStore` — applies `dark` class to `:root`, persists to `localStorage`
- **Real-time prices/sentiment:** RxJS BehaviorSubjects (`price$`, `sentiment$`) in stores
- **Notifications/toast:** Zustand stores

### Routing
- `/login` — public, full-screen Landing page (sign in / sign up / Google)
- `/*` — protected, rendered inside `DashboardLayout` with `Navbar`
- `/stock/:symbol` — dynamic stock detail with live candlestick chart
- `/backtest` — runs `GET /api/alpaca/backtest/:symbol` with configurable params
- Unknown routes redirect to `/`

### Styling
**Tailwind CSS v4** — configured via the `@tailwindcss/vite` plugin (no `tailwind.config.js`). All theme tokens are defined in `frontend/src/index.css` using `@theme {}` blocks. Do not use `tailwind.config.js`; extend the theme in `index.css` instead.

Custom CSS utilities defined in `index.css`:
- `.glass` — glassmorphism (backdrop-blur + semi-transparent bg)
- `.card-elevated` — card with hover shadow and border transitions
- `.gradient-text` — indigo-to-pink gradient clipped text
- `.btn-accent` — indigo-to-purple gradient button with hover lift
- `.dot-grid` — decorative radial dot pattern (used on Landing)
- `.animate-flash-green` / `.animate-flash-red` — price flash animations
- `.animate-shimmer` — skeleton loading shimmer

Light/dark mode: toggled by adding/removing the `dark` class on `:root`. CSS custom properties under `:root.dark` override the defaults. Do not use Tailwind's `dark:` variant — use CSS variables instead.

Color tokens available as Tailwind classes (e.g., `bg-bg`, `text-muted`, `border-border`, `text-accent`, `text-gain`, `text-loss`, `bg-gain-soft`, `bg-loss-soft`).

### Charts
Candlestick and area charts use **TradingView Lightweight Charts v5** (`lightweight-charts`). Data comes from `GET /api/alpaca/bars/:symbol?timeframe=1m&limit=200`.

### Sentiment Models
- **FinBERT:** runs locally via HuggingFace `transformers` — `GET /api/sentiment/by_ticker`
- **Llama 3:** via Groq API — `GET /api/sentiment/by_ticker_llama`
- Toggle between models in the Sentiment route UI

## Key Conventions

- **Navbar, not Sidebar:** `Sidebar.tsx` exports a component named `Navbar` — it is a horizontal top nav bar, not a sidebar. The filename is legacy; always import as `Navbar`.
- **`stores/` not `store/`:** Zustand stores live in `frontend/src/stores/` (plural). There is no `store/` directory.
- **No `App.css`:** Removed. All global styles are in `index.css`.
- **No `Topbar.tsx`:** Removed. The top bar is now the `Navbar` exported from `Sidebar.tsx`.
- **Framer Motion:** Used for page transitions (`PageTransition` in `App.tsx`) and Landing page entrance animations. Keep page-level transitions subtle (opacity + 6px y-offset, 150ms).
- **`@tanstack/react-virtual`:** Available for virtualized lists (`VirtualTable.tsx`).
- **RxJS in the frontend:** `price$` and `sentiment$` are RxJS Subjects, not Zustand stores — subscribe in components with `useEffect` + `subscription.unsubscribe()` cleanup.

For design decisions, see [DESIGN.md](./DESIGN.md).

## Important Files

| File | Purpose |
|------|---------|
| `frontend/vite.config.ts` | Vite config: Tailwind v4 plugin, dev proxy to :5001, build output to `../static/dist` |
| `frontend/src/index.css` | All global styles + Tailwind v4 `@theme` token definitions |
| `frontend/src/services/firebase.ts` | Firebase init and all auth helper exports |
| `frontend/src/components/auth/ProtectedRoute.tsx` | Auth guard — source of truth for redirect logic |
| `frontend/src/App.tsx` | Route tree, auth listener, DashboardLayout definition |
| `main.py` | Flask entry point |
| `config/settings.py` | All backend config (loaded from `.env`) |
| `data/tradesent.db` | SQLite database file (do not commit changes to this file) |
