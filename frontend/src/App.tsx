import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from './components/layout/Sidebar';
import { RightPanel } from './components/layout/RightPanel';
import { Toast } from './components/shared/Toast';
import { useWebSocket } from './hooks/useWebSocket';
import { auth, onAuthStateChanged } from './services/firebase';
import { useAuthStore } from './stores/useAuthStore';

import Home from './routes/Home';
import StockDetail from './routes/StockDetail';
import Positions from './routes/Positions';
import Orders from './routes/Orders';
import Activities from './routes/Activities';
import Balances from './routes/Balances';
import Sentiment from './routes/Sentiment';
import Backtest from './routes/Backtest';
import Learn from './routes/Learn';
import Profile from './routes/Profile';
import NotificationsPage from './routes/Notifications';

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 5_000, refetchOnWindowFocus: false } },
});

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function AppContent() {
  const location = useLocation();
  const showRight = location.pathname === '/';

  useWebSocket();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      useAuthStore.getState().setUser(user);
      useAuthStore.getState().setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      {showRight && (
        <div className="bg-blue-50 border-b border-blue-200 px-5 py-2 text-xs text-blue-700 flex items-center gap-2 shrink-0">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          You are on Paper Trading, no real money is being used.
        </div>
      )}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-y-auto p-5 min-w-0">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageTransition><Home /></PageTransition>} />
              <Route path="/stock/:symbol" element={<PageTransition><StockDetail /></PageTransition>} />
              <Route path="/positions" element={<PageTransition><Positions /></PageTransition>} />
              <Route path="/orders" element={<PageTransition><Orders /></PageTransition>} />
              <Route path="/activities" element={<PageTransition><Activities /></PageTransition>} />
              <Route path="/balances" element={<PageTransition><Balances /></PageTransition>} />
              <Route path="/sentiment" element={<PageTransition><Sentiment /></PageTransition>} />
              <Route path="/backtest" element={<PageTransition><Backtest /></PageTransition>} />
              <Route path="/learn" element={<PageTransition><Learn /></PageTransition>} />
                <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
                <Route path="/notifications" element={<PageTransition><NotificationsPage /></PageTransition>} />
            </Routes>
          </AnimatePresence>
        </div>
        {showRight && <RightPanel />}
      </div>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
