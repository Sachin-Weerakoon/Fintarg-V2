import React, { useState } from 'react';
import { useApp, computeTint, computeDark } from '../store';
import type { Page } from '../types';

const navItems: { page: Page; label: string }[] = [
  { page: 'dashboard', label: 'Home' },
  { page: 'financial', label: 'Financial' },
  { page: 'analysis', label: 'Analysis' },
  { page: 'goals', label: 'Goals' },
  { page: 'documents', label: 'Documents' },
  { page: 'advanced', label: 'Advanced Features' },
  { page: 'settings', label: 'Settings' },
];

const salaryBottomItems: { page: Page; label: string }[] = [
  { page: 'dashboard', label: 'Home' },
  { page: 'financial', label: 'Financial' },
  { page: 'analysis', label: 'Analysis' },
  { page: 'goals', label: 'Goals' },
];

const businessBottomItems: { page: Page; label: string }[] = [
  { page: 'dashboard', label: 'Home' },
  { page: 'financial', label: 'Financial' },
  { page: 'goals', label: 'Goals' },
  { page: 'advanced', label: 'Advanced' },
];

function NavIcon({ page }: { page: Page | 'more' }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (page === 'dashboard') return <svg {...common}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10M9.5 20v-6h5v6" /></svg>;
  if (page === 'financial') return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 9h18M16 14h2" /></svg>;
  if (page === 'analysis') return <svg {...common}><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" /></svg>;
  if (page === 'goals') return <svg {...common}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><path d="m15 9 5-5M16 4h4v4" /></svg>;
  if (page === 'advanced') return <svg {...common}><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></svg>;
  return <svg {...common}><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" /></svg>;
}

function pageTitleOf(page: Page): string {
  const titles: Record<Page, string> = {
    onboarding: 'Welcome', setup: 'Setup',
    dashboard: 'Home', financial: 'Financial', analysis: 'Analysis',
    goals: 'Goals', letters: 'Letters', medical: 'Medical',
    documents: 'Documents', advanced: 'Advanced Features', settings: 'Settings',
  };
  return titles[page] || page;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { state, dispatch } = useApp();
  const { currentPage, profile } = state;
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = profile.themeColor;
  const tint = computeTint(primary);
  const dark = profile.themeColor === '#0FA3B1' ? '#14284B' : computeDark(primary);

  const textSizeClass = `text-size-${profile.textSize}`;
  const darkClass = profile.darkMode ? 'dark-mode' : '';

  // Custom colors — only override when the user has set them and dark mode is off
  const customVars: React.CSSProperties = {};
  if (!profile.darkMode) {
    if (profile.colorText) (customVars as Record<string, string>)['--color-text'] = profile.colorText;
    if (profile.colorMuted) (customVars as Record<string, string>)['--color-muted'] = profile.colorMuted;
    if (profile.colorBg) (customVars as Record<string, string>)['--color-bg'] = profile.colorBg;
    if (profile.colorSurface) (customVars as Record<string, string>)['--color-surface'] = profile.colorSurface;
  }

  const visibleNav = navItems;
  const mobileBottomItems = profile.workMode === 'salary' ? salaryBottomItems : businessBottomItems;
  const isMorePage = !mobileBottomItems.some(item => item.page === currentPage);
  const modeLabel = profile.workMode === 'both' ? 'Job + Business' : profile.workMode === 'business' ? 'Business' : 'Salary';

  const go = (page: Page) => {
    dispatch({ type: 'SET_PAGE', page });
    setMoreOpen(false);
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${darkClass} ${textSizeClass}`}
      style={{
        '--color-primary': primary,
        '--color-primary-dark': dark,
        '--color-primary-tint': tint,
        ...customVars,
      } as React.CSSProperties}
    >
      {/* Desktop layout */}
      <div className="hidden md:flex min-h-screen">
        {/* Sidebar */}
        <aside
          className="flex-shrink-0 flex flex-col"
          style={{
            width: 192, minHeight: '100vh',
            background: 'var(--color-primary-dark)',
            position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="px-5 py-6">
            <div className="text-white font-bold text-base leading-tight tracking-tight">Fintarg</div>
            <div className="mt-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.03em' }}>
              {modeLabel}
            </div>
          </div>
          <nav className="flex-1 px-3 pb-4 flex flex-col gap-0.5">
            {visibleNav.map(item => (
              <button
                key={item.page}
                onClick={() => go(item.page)}
                className={`sidebar-link${currentPage === item.page ? ' active' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="px-5 pb-5">
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: primary }}
              >
                {profile.name ? profile.name[0].toUpperCase() : 'U'}
              </div>
              <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {profile.name || 'User'}
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header
            className="flex items-center justify-between px-8 py-4 sticky top-0 z-10"
            style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', backdropFilter: 'blur(8px)' }}
          >
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
              {pageTitleOf(currentPage)}
            </h1>
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: tint, color: primary }}
              >
                {modeLabel}
              </span>
              <button
                onClick={() => go('settings')}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: primary }}
                title="Settings"
              >
                {profile.name ? profile.name[0].toUpperCase() : 'U'}
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-8" style={{ background: 'var(--color-bg)' }}>
            {children}
          </main>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="mobile-shell md:hidden flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header
          className="mobile-topbar flex items-center justify-between px-4 py-3 sticky top-0 z-10 no-print"
          style={{ background: 'var(--color-primary-dark)' }}
        >
          <span className="font-bold text-white text-base">Fintarg</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              {modeLabel}
            </span>
            <button
              onClick={() => go('settings')}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'rgba(255,255,255,0.25)' }}
            >
              {profile.name ? profile.name[0].toUpperCase() : 'U'}
            </button>
          </div>
        </header>

        <main className="mobile-main flex-1 overflow-y-auto p-4" style={{ background: 'var(--color-bg)' }}>
          <h1 className="mobile-page-title text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            {pageTitleOf(currentPage)}
          </h1>
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="mobile-bottom-nav fixed bottom-0 left-0 right-0 flex no-print z-10"
          style={{ background: 'var(--color-surface)' }}
          aria-label="Primary navigation"
        >
          {mobileBottomItems.map(item => (
            <button
              type="button"
              key={item.page}
              onClick={() => go(item.page)}
              className={`mobile-nav-item${currentPage === item.page ? ' active' : ''}`}
              aria-current={currentPage === item.page ? 'page' : undefined}
            >
              <span className="mobile-nav-icon"><NavIcon page={item.page} /></span>
              <span>{item.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(v => !v)}
            className={`mobile-nav-item${moreOpen || isMorePage ? ' active' : ''}`}
            aria-expanded={moreOpen}
            aria-label="More navigation options"
          >
            <span className="mobile-nav-icon"><NavIcon page="more" /></span>
            <span>More</span>
          </button>
        </nav>

        {/* Mobile "More" sheet */}
        {moreOpen && (
          <div className="mobile-sheet-backdrop fixed inset-0 z-20 flex flex-col justify-end no-print" onClick={() => setMoreOpen(false)}>
            <div
              className="mobile-more-sheet grid grid-cols-3 gap-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="mobile-sheet-handle col-span-3" />
              <div className="col-span-3 flex items-center justify-between mb-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>More</span>
                <button type="button" className="btn-ghost" onClick={() => setMoreOpen(false)} aria-label="Close menu">Close</button>
              </div>
              {visibleNav.filter(n => !mobileBottomItems.some(m => m.page === n.page)).map(item => (
                <button
                  type="button"
                  key={item.page}
                  onClick={() => go(item.page)}
                  className="mobile-more-item flex flex-col items-center justify-center gap-2 py-4"
                  style={{
                    background: currentPage === item.page ? tint : 'var(--color-bg)',
                    color: currentPage === item.page ? primary : 'var(--color-text)',
                    borderRadius: 16,
                    fontWeight: currentPage === item.page ? 600 : 500,
                  }}
                >
                  <NavIcon page={item.page} />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
