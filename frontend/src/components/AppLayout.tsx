'use client';
import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { logout } from '@/actions/logout';
import { AppProvider, useApp } from '@/store';
import { deriveBrand, validateCustomOverrides, THEME_COLORS, deriveSidebarStyles } from '@/lib/theme';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { NotificationCenter } from '@/components/NotificationCenter';
import { pageTitleOf } from '@/lib/pageTitles';

const salaryBottomItems = [
  { href: '/', label: 'Home', page: 'dashboard' },
  { href: '/salary', label: 'Salary', page: 'salary' },
  { href: '/financial', label: 'Financial', page: 'financial' },
  { href: '/analysis', label: 'Analysis', page: 'analysis' },
];

const businessBottomItems = [
  { href: '/', label: 'Home', page: 'dashboard' },
  { href: '/financial', label: 'Financial', page: 'financial' },
  { href: '/analysis', label: 'Analysis', page: 'analysis' },
  { href: '/advanced', label: 'Advanced', page: 'advanced' },
];

function getPageIconName(page: string): IconName {
  switch (page) {
    case 'dashboard':
      return 'home';
    case 'salary':
      return 'wallet';
    case 'financial':
      return 'financial';
    case 'analysis':
      return 'analysis';
    case 'goals':
      return 'goals';
    case 'advanced':
      return 'advanced';
    case 'settings':
      return 'settings';
    default:
      return 'info';
  }
}

function AppLayoutInner({
  user,
  children,
}: {
  user: { name: string; email: string; plan: string; workMode: string; profile: any };
  children: React.ReactNode;
}) {
  const { state } = useApp();
  const profile = state?.profile || user.profile || {};
  const pathname = usePathname() || '/';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const primary = profile?.themeColor || user.profile?.themeColor || THEME_COLORS[0];
  const modeLabel = user.workMode === 'both' ? 'Job + Business' : user.workMode === 'business' ? 'Business' : 'Salary';
  const textSizeClass = `text-size-${profile?.textSize || user.profile?.textSize || 'medium'}`;
  const isDark = profile?.darkMode !== undefined ? Boolean(profile.darkMode) : (user.profile?.darkMode !== undefined ? Boolean(user.profile.darkMode) : true);
  const darkClass = isDark ? 'dark-mode' : '';

  const brandVars = deriveBrand(primary, isDark);
  const sidebarVars = deriveSidebarStyles(profile?.sidebarColor || user.profile?.sidebarColor, primary);
  const effectiveProfile = profile || user.profile;
  const { validOverrides } = !isDark && effectiveProfile ? validateCustomOverrides(effectiveProfile) : { validOverrides: {} };
  const layoutStyle = {
    ...brandVars,
    ...validOverrides,
    ...sidebarVars,
  } as React.CSSProperties;

  const mobileBottomItems = user.workMode === 'salary' ? salaryBottomItems : businessBottomItems;
  const currentTab = searchParams?.get('tab') || undefined;

  // 'both' accounts have a job as well as a business, so they get the salary tools too.
  const showSalaryInSidebar = user.workMode === 'salary' || user.workMode === 'both';
  const hasBusiness = user.workMode !== 'salary' || state.profile?.plan === 'business' || (state.companies && state.companies.length > 0);

  const navSections: { title?: string; items: { href: string; label: string; icon: IconName; isActive: boolean; badge?: string }[] }[] = [
    {
      title: 'FINANCES',
      items: [
        { href: '/', label: 'Home', icon: 'home', isActive: pathname === '/' },
        { href: '/financial', label: 'Financial Ledger', icon: 'financial', isActive: pathname === '/financial' },
        { href: '/analysis', label: 'Analysis & Intel', icon: 'analysis', isActive: pathname === '/analysis' },
        { href: '/goals', label: 'Financial Goals', icon: 'goals', isActive: pathname === '/goals' },
      ],
    },
    {
      title: 'WORK & ENTERPRISE',
      items: [
        ...(showSalaryInSidebar
          ? [{ href: '/salary', label: 'Salary & Payday', icon: 'wallet' as IconName, isActive: pathname === '/salary' }]
          : []),
        ...(hasBusiness
          ? [
              {
                href: '/advanced?tab=businesses',
                label: 'Businesses',
                icon: 'bank' as IconName,
                isActive: pathname === '/advanced' && (currentTab === 'businesses' || currentTab === 'companies'),
                badge: state.companies?.length > 0 ? `${state.companies.length}` : undefined,
              },
            ]
          : []),
      ],
    },
    {
      title: 'VAULT & TOOLS',
      items: [
        { href: '/advanced/medical', label: 'Medical Vault', icon: 'heart', isActive: pathname === '/advanced/medical' },
        { href: '/advanced/letters', label: 'Formal Letters', icon: 'file-text', isActive: pathname === '/advanced/letters' },
        { href: '/advanced', label: 'Advanced Hub', icon: 'advanced', isActive: pathname === '/advanced' && (!currentTab || currentTab === 'hub') },
      ],
    },
    {
      title: 'PREFERENCES',
      items: [
        { href: '/settings', label: 'Settings', icon: 'settings', isActive: pathname === '/settings' },
      ],
    },
  ];

  const allNavItems = navSections.flatMap(s => s.items);
  const isMorePage = !mobileBottomItems.some(item => pathname === item.href);

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
    <div className={`min-h-screen flex flex-col bg-bg text-text ${darkClass} ${textSizeClass}`} style={layoutStyle}>
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
            className="w-64 min-h-screen sticky top-0 h-screen overflow-y-auto border-r border-[color:var(--color-sidebar-border,rgba(255,255,255,0.08))] flex-shrink-0 flex flex-col transition-colors duration-300"
            style={{
              background: `linear-gradient(to bottom, var(--color-sidebar-bg, #0B1220), var(--color-sidebar-to, #070D18))`,
            }}
          >
            <div className="px-5 py-6">
              <div className="flex flex-col gap-2.5">
                <BrandLogo variant="full" height={34} className="self-start" />
                <div className="flex items-center gap-1.5 text-xs font-medium text-chrome-text">
                  <span className="w-1.5 h-1.5 rounded-full bg-success-solid animate-pulse" />
                  <span>{modeLabel}</span>
                  <span className="ml-1 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded text-primary-400 bg-primary-tint/20 border border-primary-400/30">
                    v2
                  </span>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-3 pb-4 flex flex-col gap-3 overflow-y-auto" aria-label="Main navigation">
              {navSections.map((section, sIdx) => {
                if (section.items.length === 0) return null;
                return (
                  <div key={section.title || sIdx} className="space-y-0.5">
                    {section.title && (
                      <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-chrome-text/60 select-none">
                        {section.title}
                      </div>
                    )}
                    {section.items.map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-link${item.isActive ? ' active' : ''}`}
                        aria-current={item.isActive ? 'page' : undefined}
                      >
                        <span className="sidebar-icon">
                          <Icon name={item.icon} size={17} />
                        </span>
                        <span className="truncate flex-1 text-xs">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-chrome-text font-bold">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </nav>

            <div className="px-4 pb-5 pt-3 border-t border-white/5">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                <Avatar
                  name={user.name || 'User'}
                  fileId={user.profile?.profilePictureFileId}
                  size="sm"
                  className="rounded-lg shadow-sm"
                />
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
                  href="https://raxwo.net"
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
              className="flex items-center justify-between px-8 py-4 sticky top-0 z-10 backdrop-blur-md bg-surface/90 border-b border-border"
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
                <NotificationCenter variant="light" />
                <Link
                  href="/settings"
                  className="rounded-xl transition-transform hover:scale-105 overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary-500"
                  title="Settings"
                  aria-label="Settings"
                >
                  <Avatar
                    name={user.name || 'User'}
                    fileId={user.profile?.profilePictureFileId}
                    size="md"
                    className="!rounded-xl shadow-sm"
                  />
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSignOut}
                  loading={signingOut}
                  iconLeft={<Icon name="logout" size={14} />}
                >
                  Sign out
                </Button>
              </div>
            </header>

            <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-8 focus:outline-none bg-bg">
              {children}
            </main>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="mobile-shell md:hidden flex flex-col min-h-screen">
          <header
            className="mobile-topbar flex items-center justify-between px-3.5 py-2.5 sticky top-0 z-10 no-print bg-chrome-900 border-b border-white/[0.08]"
          >
            <div className="flex items-center gap-2 flex-shrink-0">
              <BrandLogo variant="full" height={24} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <NotificationCenter variant="dark" />
              <span className="hidden xs:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white whitespace-nowrap">
                {modeLabel}
              </span>
              <Link
                href="/settings"
                className="rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/40 flex-shrink-0"
                aria-label="Settings"
              >
                <Avatar
                  name={user.name || 'User'}
                  fileId={user.profile?.profilePictureFileId}
                  size="sm"
                  className="!w-7 !h-7"
                />
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                loading={signingOut}
                className="!text-xs !py-1 !px-2.5 !min-h-[30px] !rounded-full text-white border border-white/20 bg-white/5 flex-shrink-0"
              >
                Sign out
              </Button>
            </div>
          </header>

          <main id="main-content" tabIndex={-1} className="mobile-main flex-1 overflow-y-auto p-4 pb-28 focus:outline-none bg-bg">
            {children}
          </main>

          <nav
            className="mobile-bottom-nav fixed bottom-0 left-0 right-0 flex no-print z-10 bg-surface border-t border-border pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
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
            <Button
              variant="ghost"
              onClick={() => setMoreOpen(v => !v)}
              className={`mobile-nav-item min-h-[44px] !rounded-none !border-0 !p-0 ${moreOpen || isMorePage ? ' active' : ''}`}
              aria-expanded={moreOpen}
              aria-label="More navigation options"
            >
              <span className="mobile-nav-icon">
                <Icon name="more" size={20} />
              </span>
              <span>More</span>
            </Button>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="!text-xs !py-1 !px-2"
                    onClick={() => setMoreOpen(false)}
                    aria-label="Close menu"
                  >
                    Close
                  </Button>
                </div>
                {allNavItems
                  .filter(n => !mobileBottomItems.some(m => m.href === n.href))
                  .map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="mobile-more-item flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-xl border border-border bg-surface-hover/50 hover:bg-surface-hover transition-colors min-h-[44px]"
                    >
                      <Icon name={item.icon} size={20} className="text-primary-text" />
                      <span className="text-xs font-medium text-text text-center">{item.label}</span>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
  );
}

export default function AppLayout({
  user,
  children,
}: {
  user: { name: string; email: string; plan: string; workMode: string; profile: any };
  children: React.ReactNode;
}) {
  const initialDarkMode = user.profile?.darkMode !== undefined ? Boolean(user.profile.darkMode) : true;
  return (
    <AppProvider
      initialProfile={{
        ...(user.profile || {}),
        darkMode: initialDarkMode,
        plan: (user.plan as any) || user.profile?.plan || 'basic',
        workMode: user.workMode as any,
      }}
    >
      <AppLayoutInner user={user}>{children}</AppLayoutInner>
    </AppProvider>
  );
}
