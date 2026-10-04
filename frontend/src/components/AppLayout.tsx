'use client';
import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppProvider } from '@/store';

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

export default function AppLayout({ user, children }: { user: { name: string; email: string; plan: string; workMode: string; profile: any }; children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = user.profile?.themeColor || '#0FA3B1';
  const modeLabel = user.workMode === 'both' ? 'Job + Business' : user.workMode === 'business' ? 'Business' : 'Salary';
  const textSizeClass = `text-size-${user.profile?.textSize || 'medium'}`;
  const darkClass = user.profile?.darkMode ? 'dark-mode' : '';

  const mobileBottomItems = user.workMode === 'salary' ? salaryBottomItems : businessBottomItems;
  const isMorePage = !mobileBottomItems.some(item => item.page === pathname.replace('/', ''));
  const currentTab = searchParams?.get('tab') || undefined;

  return (
    <AppProvider initialProfile={user.profile || {}}>
      <div className={`min-h-screen flex flex-col ${darkClass} ${textSizeClass}`} style={{ '--color-primary': primary } as React.CSSProperties}>
      {/* Desktop layout */}
      <div className="hidden md:flex min-h-screen">
        <aside className="flex-shrink-0 flex flex-col" style={{ width: 192, minHeight: '100vh', background: 'var(--color-primary-dark)', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-6">
            <div className="text-white font-bold text-base leading-tight tracking-tight">Fintarg</div>
            <div className="mt-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.03em' }}>{modeLabel}</div>
          </div>
          <nav className="flex-1 px-3 pb-4 flex flex-col gap-0.5">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={`sidebar-link${pathname === item.href ? ' active' : ''}`}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="px-5 pb-5">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: primary }}>
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>{user.name || 'User'}</div>
            </div>
          </div>
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center justify-between px-8 py-4 sticky top-0 z-10" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>{pageTitleOf(pathname, currentTab)}</h1>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--color-primary-tint)', color: primary }}>{modeLabel}</span>
              <Link href="/settings" className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: primary }} title="Settings">
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </Link>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-8" style={{ background: 'var(--color-bg)' }}>{children}</main>
        </div>
      </div>
      {/* Mobile layout */}
      <div className="mobile-shell md:hidden flex flex-col min-h-screen">
        <header className="mobile-topbar flex items-center justify-between px-4 py-3 sticky top-0 z-10 no-print" style={{ background: 'var(--color-primary-dark)' }}>
          <span className="font-bold text-white text-base">Fintarg</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>{modeLabel}</span>
            <Link href="/settings" className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: 'rgba(255,255,255,0.25)' }}>{user.name ? user.name[0].toUpperCase() : 'U'}</Link>
          </div>
        </header>
        <main className="mobile-main flex-1 overflow-y-auto p-4" style={{ background: 'var(--color-bg)' }}>
          <h1 className="mobile-page-title text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>{pageTitleOf(pathname, currentTab)}</h1>
          {children}
        </main>
        <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 flex no-print z-10" style={{ background: 'var(--color-surface)' }} aria-label="Primary navigation">
          {mobileBottomItems.map(item => (
            <Link key={item.href} href={item.href} className={`mobile-nav-item${pathname === item.href ? ' active' : ''}`} aria-current={pathname === item.href ? 'page' : undefined}>
              <span className="mobile-nav-icon">{getIcon(item.page)}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          <button type="button" onClick={() => setMoreOpen(v => !v)} className={`mobile-nav-item${moreOpen || isMorePage ? ' active' : ''}`} aria-expanded={moreOpen} aria-label="More navigation options">
            <span className="mobile-nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" /></svg></span>
            <span>More</span>
          </button>
        </nav>
        {moreOpen && (
          <div className="mobile-sheet-backdrop fixed inset-0 z-20 flex flex-col justify-end no-print" onClick={() => setMoreOpen(false)}>
            <div className="mobile-more-sheet grid grid-cols-3 gap-3" onClick={e => e.stopPropagation()}>
              <div className="mobile-sheet-handle col-span-3" />
              <div className="col-span-3 flex items-center justify-between mb-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>More</span>
                <button type="button" className="btn-ghost" onClick={() => setMoreOpen(false)} aria-label="Close menu">Close</button>
              </div>
              {navItems.filter(n => !mobileBottomItems.some(m => m.page === n.page)).map(item => (
                <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className="mobile-more-item flex flex-col items-center justify-center gap-2 py-4">
                  <span className="text-xs font-medium">{item.label}</span>
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

function getIcon(page: string) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  if (page === 'dashboard') return <svg {...common}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10M9.5 20v-6h5v6" /></svg>;
  if (page === 'financial') return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 9h18M16 14h2" /></svg>;
  if (page === 'analysis') return <svg {...common}><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" /></svg>;
  if (page === 'goals') return <svg {...common}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><path d="m15 9 5-5M16 4h4v4" /></svg>;
  if (page === 'advanced') return <svg {...common}><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></svg>;
  return <svg {...common}><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" /></svg>;
}
