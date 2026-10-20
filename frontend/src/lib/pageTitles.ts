/**
 * Top-header title for a route. Names match the sidebar labels in AppLayout so a page
 * is called the same thing in the nav, the header and its own <h1>.
 */
export function pageTitleOf(pathname: string, tab?: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path === '/') return 'Home';
  if (path === '/salary') return 'Salary & Payday';
  if (path === '/financial') return 'Financial';
  if (path === '/analysis') return 'Analysis';
  if (path === '/goals') return 'Goals';
  if (path === '/advanced/medical' || path.startsWith('/advanced/medical/')) return 'Medical Vault';
  if (path === '/advanced/letters' || path.startsWith('/advanced/letters/')) return 'Formal Letters';
  if (path === '/advanced') {
    if (tab === 'salary') return 'Salary & Payday';
    if (tab === 'letters') return 'Formal Letters';
    if (tab === 'medical') return 'Medical Vault';
    if (tab === 'agreements') return 'Business Agreements';
    return 'Advanced Features';
  }
  if (path === '/settings') return 'Settings';
  return 'Fintarg';
}
