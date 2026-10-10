'use client';
import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { logout } from '@/actions/logout';
import { AppProvider } from '@/store';
import { deriveBrand, validateCustomOverrides } from '@/lib/theme';
import { Icon, type IconName } from '@/components/ui/Icon';

const navItems = [
  { href: '/', label: 'Home', page: 'dashboard' },
  { href: '/financial', label: 'Financial', page: 'financial' },
  { href: '/analysis', label: 'Analysis', page: 'analysis' },
  { href: '/goals', label: 'Goals', page: 'goals' },
  { href: '/documents', label: 'Documents', page: 'documents' },
  { href: '/advanced', label: 'Advanced Features', page: 'advanced' },
  { href: '/settings', label: 'Settings', page: 'settings' },
];

const salaryBottomItems = [
  { href: '/', label: 'Home', page: 'dashboard' },
  { href: '/financial', label: 'Financial', page: 'financial' },
  { href: '/analysis', label: 'Analysis', page: 'analysis' },
  { href: '/goals', label: 'Goals', page: 'goals' },
];

const businessBottomItems = [
  { href: '/', label: 'Home', page: 'dashboard' },
  { href: '/financial', label: 'Financial', page: 'financial' },
  { href: '/goals', label: 'Goals', page: 'goals' },
  { href: '/advanced', label: 'Advanced', page: 'advanced' },
];

function getPageIconName(page: string): IconName {
  switch (page) {
    case 'dashboard':
      return 'home';
    case 'financial':
      return 'financial';
    case 'analysis':
      return 'analysis';
    case 'goals':
      return 'goals';
    case 'documents':
      return 'documents';
    case 'advanced':
      return 'advanced';
    case 'settings':
      return 'settings';
    default:
      return 'info';
  }
}

function pageTitleOf(pathname: string, tab?: string): string {
  if (pathname === '/') return 'Home';
  if (pathname === '/financial') return 'Financial';
  if (pathname === '/analysis') return 'Analysis';
  if (pathname === '/goals') return 'Goals';
  if (pathname === '/documents') return 'Documents';
  if (pathname === '/advanced') {
    if (tab === 'letters') return 'Letters';
    if (tab === 'medical') return 'Medical';
    if (tab === 'agreements') return 'Business Agreements';
    return 'Advanced Features';
  }
  if (pathname === '/settings') return 'Settings';
  return 'Fintarg';
}

export default function AppLayout({
  user,
  children,
}: {
  user: { name: string; email: string; plan: string; workMode: string; profile: any };
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const primary = user.profile?.themeColor || '#0FA3B1';
  const modeLabel = user.workMode === 'both' ? 'Job + Business' : user.workMode === 'business' ? 'Business' : 'Salary';
  const textSizeClass = `text-size-${user.profile?.textSize || 'medium'}`;
  const isDark = Boolean(user.profile?.darkMode);
  const darkClass = isDark ? 'dark-mode' : '';

  const brandVars = deriveBrand(primary, isDark);
  const { validOverrides } = !isDark && user.profile ? validateCustomOverrides(user.profile) : { validOverrides: {} };
  const layoutStyle = {
    ...brandVars,
    ...validOverrides,
  } as React.CSSProperties;

  const mobileBottomItems = user.workMode === 'salary' ? salaryBottomItems : businessBottomItems;
  const isMorePage = !mobileBottomItems.some(item => item.page === pathname.replace('/', ''));
  const currentTab = searchParams?.get('tab') || undefined;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      router.push('/welcome');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <AppProvider initialProfile={user.profile || {}}>
      <div className={`min-h-screen flex flex-col ${darkClass} ${textSizeClass}`} style={layoutStyle}>
        {/* Skip to main content accessibility link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
        >
          Skip to content
        </a>

        {/* Desktop layout */}
        <div className="hidden md:flex min-h-screen">
          <aside
            className="flex-shrink-0 flex flex-col"
            style={{
              width: 240,
              minHeight: '100vh',
              background: 'linear-gradient(180deg, var(--color-chrome-900) 0%, var(--color-chrome-800) 100%)',
              position: 'sticky',
              top: 0,
              height: '100vh',
              overflowY: 'auto',
              borderRight: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div className="px-5 py-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 p-1.5 shadow-md flex-shrink-0 border border-white/10">
                  <img src="/brand/fintarg-logo.svg" alt="Fintarg Logo" className="w-6 h-6 object-contain" />
                </div>
                <div>
                  <div className="text-white font-bold text-lg leading-tight tracking-tight flex items-center gap-2">
                    <span>Fintarg</span>
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded text-primary-400 bg-primary-tint/20 border border-primary-400/30">
                      v2
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-chrome-text">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-solid animate-pulse" />
                    <span>{modeLabel}</span>
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-3 pb-4 flex flex-col gap-1" aria-label="Main navigation">
              {navItems.map(item => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link${isActive ? ' active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="sidebar-icon">
                      <Icon name={getPageIconName(item.page)} size={18} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="px-4 pb-5 pt-3 border-t border-white/5">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700))' }}
                >
                  {user.profile?.profilePictureFileId ? (
                    <img
                      src={`/api/files/${encodeURIComponent(user.profile.profilePictureFileId)}`}
                      alt={user.name || 'User avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.name ? user.name[0].toUpperCase() : 'U'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{user.name || 'User'}</div>
                  <div className="text-[11px] text-chrome-text truncate">{user.email || 'Free tier'}</div>
                </div>
                <Link href="/settings" className="text-chrome-text hover:text-white transition-colors" title="Settings" aria-label="Settings">
                  <Icon name="settings" size={16} />
                </Link>
              </div>
              <div className="pt-2 px-1 flex items-center justify-between text-[11px] text-chrome-text">
                <a
                  href="https://raxwo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1 opacity-75 hover:opacity-100"
                >
                  <span>By</span>
                  <span className="font-semibold text-primary-400">Raxwo</span>
                </a>
                <span className="text-[10px] text-chrome-text/50">v2.0</span>
              </div>
            </div>
          </aside>

          <div className="flex-1 flex flex-col min-w-0">
            <header
              className="flex items-center justify-between px-8 py-4 sticky top-0 z-10 backdrop-blur-md bg-opacity-90"
              style={{
                background: 'color-mix(in srgb, var(--color-surface) 92%, transparent)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-muted">
                  Workspace · {modeLabel}
                </div>
                <div className="text-xl font-bold tracking-tight mt-0.5 text-text">
                  {pageTitleOf(pathname, currentTab)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/settings"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm transition-transform hover:scale-105 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700))' }}
                  title="Settings"
                  aria-label="Settings"
                >
                  {user.profile?.profilePictureFileId ? (
                    <img
                      src={`/api/files/${encodeURIComponent(user.profile.profilePictureFileId)}`}
                      alt={user.name || 'User avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.name ? user.name[0].toUpperCase() : 'U'
                  )}
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="btn-secondary !min-h-[38px] !py-1.5 !px-3.5 !text-xs font-medium"
                >
                  <Icon name="logout" size={14} />
                  <span>{signingOut ? 'Signing out...' : 'Sign out'}</span>
                </button>
              </div>
            </header>

            <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-8 focus:outline-none" style={{ background: 'var(--color-bg)' }}>
              {children}
            </main>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="mobile-shell md:hidden flex flex-col min-h-screen">
          <header
            className="mobile-topbar flex items-center justify-between px-4 py-3 sticky top-0 z-10 no-print"
            style={{ background: 'var(--color-chrome-900)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <img src="/brand/fintarg-logo.svg" alt="Fintarg logo" className="w-6 h-6 object-contain" />
              <span className="font-bold text-white text-base tracking-tight">Fintarg</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/10 text-white">
                {modeLabel}
              </span>
              <Link
                href="/settings"
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm bg-white/20 overflow-hidden"
                aria-label="Settings"
              >
                {user.profile?.profilePictureFileId ? (
                  <img
                    src={`/api/files/${encodeURIComponent(user.profile.profilePictureFileId)}`}
                    alt={user.name || 'User avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.name ? user.name[0].toUpperCase() : 'U'
                )}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="text-xs font-medium px-2.5 py-1 rounded-full border border-white/20 text-white bg-white/5"
              >
                {signingOut ? '...' : 'Sign out'}
              </button>
            </div>
          </header>

          <main id="main-content" tabIndex={-1} className="mobile-main flex-1 overflow-y-auto p-4 pb-20 focus:outline-none" style={{ background: 'var(--color-bg)' }}>
            <div className="mobile-page-title text-lg font-semibold mb-4 text-text">
              {pageTitleOf(pathname, currentTab)}
            </div>
            {children}
          </main>

          <nav
            className="mobile-bottom-nav fixed bottom-0 left-0 right-0 flex no-print z-10"
            style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}
            aria-label="Primary navigation"
          >
            {mobileBottomItems.map(item => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mobile-nav-item min-h-[44px]${isActive ? ' active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="mobile-nav-icon">
                    <Icon name={getPageIconName(item.page)} size={20} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(v => !v)}
              className={`mobile-nav-item min-h-[44px]${moreOpen || isMorePage ? ' active' : ''}`}
              aria-expanded={moreOpen}
              aria-label="More navigation options"
            >
              <span className="mobile-nav-icon">
                <Icon name="more" size={20} />
              </span>
              <span>More</span>
            </button>
          </nav>

          {moreOpen && (
            <div
              className="mobile-sheet-backdrop fixed inset-0 z-20 flex flex-col justify-end no-print bg-black/60 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            >
              <div
                className="mobile-more-sheet grid grid-cols-3 gap-3 p-4 rounded-t-2xl bg-surface border-t border-border shadow-overlay"
                onClick={e => e.stopPropagation()}
              >
                <div className="mobile-sheet-handle col-span-3 w-12 h-1 rounded-full bg-border-input/40 mx-auto mb-2" />
                <div className="col-span-3 flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-text">More Options</span>
                  <button
                    type="button"
                    className="btn-ghost text-xs py-1 px-2"
                    onClick={() => setMoreOpen(false)}
                    aria-label="Close menu"
                  >
                    Close
                  </button>
                </div>
                {navItems
                  .filter(n => !mobileBottomItems.some(m => m.page === n.page))
                  .map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="mobile-more-item flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-xl border border-border bg-surface-hover/50 hover:bg-surface-hover transition-colors min-h-[44px]"
                    >
                      <Icon name={getPageIconName(item.page)} size={20} className="text-primary-text" />
                      <span className="text-xs font-medium text-text text-center">{item.label}</span>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppProvider>
  );
}
