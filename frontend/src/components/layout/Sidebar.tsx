import { useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useSidebarStore } from '../../stores/useSidebarStore';

// ─── Icons ────────────────────────────────────────────────────────────────────
const NavIcon = {
  home: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  sentiment: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  learn: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  ),
  bell: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  positions: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" /><path d="M9 21V9" />
    </svg>
  ),
  orders: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  activities: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  balances: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  chevronLeft: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  menu: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

const NAV_SECTIONS = [
  {
    items: [{ to: '/', label: 'Home', icon: NavIcon.home, end: true }],
  },
  {
    label: 'Account',
    items: [
      { to: '/positions', label: 'Positions', icon: NavIcon.positions },
      { to: '/orders', label: 'Orders', icon: NavIcon.orders },
      { to: '/activities', label: 'Activities', icon: NavIcon.activities },
      { to: '/balances', label: 'Balances', icon: NavIcon.balances },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/sentiment', label: 'Sentiment', icon: NavIcon.sentiment },
      { to: '/learn', label: 'Learn', icon: NavIcon.learn },
    ],
  },
  {
    items: [{ to: '/notifications', label: 'Notifications', icon: NavIcon.bell }],
  },
];

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const { user } = useAuthStore();
  const initials = user?.displayName
    ? user.displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';
  const cls = size === 'md' ? 'w-8 h-8 text-[11px]' : 'w-6 h-6 text-[9px]';
  if (user?.photoURL) {
    return (
      <img src={user.photoURL} referrerPolicy="no-referrer"
        className={`${cls} rounded-sm object-cover shrink-0`} alt="avatar" />
    );
  }
  return (
    <div className={`${cls} rounded-sm flex items-center justify-center font-bold shrink-0`}
      style={{ background: 'var(--color-accent)', color: '#09090b' }}>
      {initials}
    </div>
  );
}

// ─── NavLink class helpers ────────────────────────────────────────────────────
const linkClass = (isActive: boolean, collapsed: boolean) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13px] transition-colors duration-100 ${
    collapsed ? 'justify-center' : ''
  } ${
    isActive ? 'bg-accent/10 text-accent font-medium' : 'text-muted hover:text-text hover:bg-hover'
  }`;

// ─── Main ─────────────────────────────────────────────────────────────────────
export function Sidebar() {
  const { isCollapsed, isMobileOpen, toggleCollapse, toggleMobile, closeMobile } = useSidebarStore();
  const location = useLocation();
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  // Close mobile drawer on route change
  useEffect(() => { closeMobile(); }, [location.pathname]);


  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  const NavLinks = ({ collapsed }: { collapsed: boolean }) => (
    <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-6 scrollbar-thin">
      {NAV_SECTIONS.map((section, i) => (
        <div key={i}>
          {section.label && !collapsed && (
            <p className="terminal-section-label mb-2">{section.label}</p>
          )}
          <div className="flex flex-col gap-1">
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : undefined}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) => linkClass(isActive, collapsed)}
              >
                {item.icon}
                {!collapsed && <span className="truncate">{item.label}</span>}
                {item.to === '/notifications' && unreadCount > 0 && !collapsed && (
                  <span className="ml-auto min-w-[18px] h-[18px] bg-accent text-bg text-[10px] font-mono font-bold rounded-sm flex items-center justify-center px-1 leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                {item.to === '/notifications' && unreadCount > 0 && collapsed && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-accent rounded-full" />
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* ── Mobile topbar (< md) ──────────────────────────────────────── */}
      <div className="md:hidden h-12 flex items-center justify-between px-4 bg-sidebar-bg border-b border-sidebar-border shrink-0 fixed top-0 left-0 right-0 z-50">
        <button
          onClick={toggleMobile}
          aria-label="Open navigation"
          className="p-1.5 rounded-sm text-muted hover:text-text hover:bg-hover transition-colors"
        >
          {NavIcon.menu}
        </button>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
            <svg className="w-3 h-3" style={{ color: '#09090b' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            </svg>
          </div>
          <span className="text-sm font-bold font-mono">TradeSent<span className="text-accent">.AI</span></span>
        </Link>
        <div className="flex items-center gap-1">
        </div>
      </div>

      {/* Spacer for mobile topbar */}
      <div className="md:hidden h-12 shrink-0" />

      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col h-screen shrink-0 overflow-hidden bg-sidebar-bg border-r border-sidebar-border transition-[width] duration-200 ease-in-out relative`}
        style={{ width: isCollapsed ? 52 : 200 }}
      >
        {/* Logo */}
        <div className={`flex items-center h-12 border-b border-sidebar-border shrink-0 px-3 ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0" style={{ background: 'var(--color-accent)' }}>
              <svg className="w-3 h-3" style={{ color: '#09090b' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              </svg>
            </div>
            {!isCollapsed && (
              <span className="text-sm font-bold font-mono whitespace-nowrap overflow-hidden">
                TradeSent<span className="text-accent">.AI</span>
              </span>
            )}
          </Link>
        </div>

        {/* Nav links */}
        <NavLinks collapsed={isCollapsed} />

        {/* Footer */}
        <div className={`border-t border-sidebar-border px-2 py-3 shrink-0 flex items-center ${isCollapsed ? 'flex-col gap-1' : 'justify-between gap-1'}`}>
          <NavLink to="/profile" className={({ isActive }) => `p-1.5 rounded-sm transition-colors ${isActive ? 'text-accent bg-accent/10' : 'text-muted hover:text-text hover:bg-hover'}`}>
            <Avatar size="sm" />
          </NavLink>
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-sm text-muted hover:text-text hover:bg-hover transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
          >
            {NavIcon.chevronLeft}
          </button>
        </div>
      </aside>

      {/* ── Mobile drawer (slides from LEFT) ─────────────────────────── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[598] bg-black/50"
              onClick={closeMobile}
            />

            {/* Panel — slides in from LEFT */}
            <motion.aside
              key="drawer"
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed top-0 left-0 h-full w-72 z-[599] flex flex-col bg-card border-r border-border shadow-2xl"
            >
              {/* Drawer header */}
              <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
                <Link to="/" className="flex items-center gap-2" onClick={closeMobile}>
                  <div className="w-6 h-6 rounded-sm flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
                    <svg className="w-3 h-3" style={{ color: '#09090b' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold font-mono">TradeSent<span className="text-accent">.AI</span></span>
                </Link>
                <button
                  onClick={closeMobile}
                  aria-label="Close navigation"
                  className="p-1.5 rounded-sm text-muted hover:text-text hover:bg-hover transition-colors"
                >
                  {NavIcon.close}
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-6 scrollbar-thin">
                {NAV_SECTIONS.map((section, i) => (
                  <div key={i}>
                    {section.label && (
                      <p className="terminal-section-label mb-2">{section.label}</p>
                    )}
                    <div className="flex flex-col gap-1">
                      {section.items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={'end' in item ? item.end : undefined}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors duration-100 ${
                              isActive ? 'bg-accent/10 text-accent font-semibold' : 'text-muted hover:text-text hover:bg-hover'
                            }`
                          }
                        >
                          {item.icon}
                          <span>{item.label}</span>
                          {item.to === '/notifications' && unreadCount > 0 && (
                            <span className="ml-auto min-w-[18px] h-[18px] bg-accent text-bg text-[10px] font-mono font-bold rounded-sm flex items-center justify-center px-1 leading-none">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              {/* Profile footer */}
              <div className="px-3 py-3 border-t border-border shrink-0">
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors duration-100 ${
                      isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:text-text hover:bg-hover'
                    }`
                  }
                >
                  <Avatar size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight truncate font-mono">
                      {user?.displayName ?? user?.email ?? 'Profile'}
                    </p>
                    {user?.email && user?.displayName && (
                      <p className="text-[11px] text-muted truncate">{user.email}</p>
                    )}
                  </div>
                </NavLink>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
