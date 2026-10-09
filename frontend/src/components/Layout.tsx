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
  if (page === 'documents') return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>;
  if (page === 'letters') return <svg {...common}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
  if (page === 'medical') return <svg {...common}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
  if (page === 'advanced') return <svg {...common}><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></svg>;
  if (page === 'settings') return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
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
            width: 240, minHeight: '100vh',
            background: 'linear-gradient(180deg, #0e1c33 0%, #081120 100%)',
            position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
            borderRight: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="px-5 py-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-md" style={{ background: `linear-gradient(135deg, ${primary}, #0891b2)` }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <div>
                <div className="text-white font-bold text-lg leading-tight tracking-tight flex items-center gap-2">
                  <span>Fintarg</span>
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded text-cyan-300 bg-cyan-950/70 border border-cyan-800/60">v2</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{modeLabel}</span>
                </div>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-3 pb-4 flex flex-col gap-1">
            {visibleNav.map(item => (
              <button
                key={item.page}
                onClick={() => go(item.page)}
                className={`sidebar-link${currentPage === item.page ? ' active' : ''}`}
              >
                <span className="sidebar-icon"><NavIcon page={item.page} /></span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="px-4 pb-5 pt-3 border-t border-white/5">
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${primary}, #0284c7)` }}
              >
                {profile.name ? profile.name[0].toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{profile.name || 'User'}</div>
                <div className="text-[11px] text-slate-400 truncate">{modeLabel}</div>
              </div>
              <button onClick={() => go('settings')} className="text-slate-400 hover:text-white transition-colors" title="Settings">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header
            className="flex items-center justify-between px-8 py-4 sticky top-0 z-10 backdrop-blur-md bg-opacity-90"
            style={{ background: 'color-mix(in srgb, var(--color-surface) 92%, transparent)', borderBottom: '1px solid var(--color-border)' }}
          >
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-muted)' }}>Workspace · {modeLabel}</div>
              <h1 className="text-xl font-bold tracking-tight mt-0.5" style={{ color: 'var(--color-text)' }}>
                {pageTitleOf(currentPage)}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-semibold px-3 py-1.5 rounded-full border"
                style={{ background: tint, borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)', color: primary }}
              >
                {modeLabel}
              </span>
              <button
                onClick={() => go('settings')}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm transition-transform hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${primary}, #0284c7)` }}
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
