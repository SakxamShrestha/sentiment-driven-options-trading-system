import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from './components/layout/Sidebar';
import { RightPanel } from './components/layout/RightPanel';
import { Toast } from './components/shared/Toast';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useWebSocket } from './hooks/useWebSocket';
import { auth, onAuthStateChanged } from './services/firebase';
import { useAuthStore } from './stores/useAuthStore';

import Landing from './routes/Landing';
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
      className="w-full"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/** Dashboard shell — only rendered for authenticated users */
function DashboardLayout() {
  const location = useLocation();
  const showRight = location.pathname === '/';

  useWebSocket();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      {showRight && (
        <div className="bg-gradient-to-r from-accent/5 via-accent/8 to-accent/5 border-b border-accent/10 px-5 py-2 text-xs text-accent flex items-center gap-2 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
          Paper Trading Mode — no real money is being used.
        </div>
      )}
      <div className="flex-1 overflow-hidden flex">
        <div
          className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0 flex flex-col items-center"
          style={showRight ? {
            background: 'radial-gradient(ellipse 70% 55% at 15% 10%, rgba(56,97,251,0.07) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at 85% 90%, rgba(107,138,253,0.05) 0%, transparent 55%)',
          } : undefined}
        >
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/"              element={<PageTransition><Home /></PageTransition>} />
              <Route path="/stock/:symbol" element={<PageTransition><StockDetail /></PageTransition>} />
              <Route path="/positions"     element={<PageTransition><Positions /></PageTransition>} />
              <Route path="/orders"        element={<PageTransition><Orders /></PageTransition>} />
              <Route path="/activities"    element={<PageTransition><Activities /></PageTransition>} />
              <Route path="/balances"      element={<PageTransition><Balances /></PageTransition>} />
              <Route path="/sentiment"     element={<PageTransition><Sentiment /></PageTransition>} />
              <Route path="/backtest"      element={<PageTransition><Backtest /></PageTransition>} />
              <Route path="/learn"         element={<PageTransition><Learn /></PageTransition>} />
              <Route path="/profile"       element={<PageTransition><Profile /></PageTransition>} />
              <Route path="/notifications" element={<PageTransition><NotificationsPage /></PageTransition>} />
              <Route path="*"              element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </div>
        {showRight && <RightPanel />}
      </div>
      <Toast />
    </div>
  );
}

function AppContent() {
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      useAuthStore.getState().setUser(user);
      useAuthStore.getState().setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <Routes>
      {/* Public — landing/login page (full screen, no navbar) */}
      <Route path="/login" element={<Landing />} />

      {/* Protected — everything else goes through ProtectedRoute */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
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
