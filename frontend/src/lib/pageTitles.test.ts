import { describe, expect, it } from 'vitest';
import { pageTitleOf } from './pageTitles';

describe('pageTitleOf', () => {
  it.each([
    ['/', undefined, 'Home'],
    ['/salary', undefined, 'Salary & Payday'],
    ['/financial', undefined, 'Financial'],
    ['/analysis', undefined, 'Analysis'],
    ['/goals', undefined, 'Goals'],
    ['/settings', undefined, 'Settings'],
    ['/advanced', undefined, 'Advanced Features'],
    ['/advanced', 'hub', 'Advanced Features'],
    ['/advanced', 'businesses', 'Advanced Features'],
    ['/advanced', 'salary', 'Salary & Payday'],
    ['/advanced', 'letters', 'Formal Letters'],
    ['/advanced', 'medical', 'Medical Vault'],
    ['/advanced', 'agreements', 'Business Agreements'],
    ['/advanced/medical', undefined, 'Medical Vault'],
    ['/advanced/medical/', undefined, 'Medical Vault'],
    ['/advanced/letters', undefined, 'Formal Letters'],
    ['/advanced/letters/print', undefined, 'Formal Letters'],
    ['/unknown', undefined, 'Fintarg'],
    ['/advanced/unknown', undefined, 'Fintarg'],
  ])('%s (tab=%s) -> %s', (path, tab, title) => {
    expect(pageTitleOf(path, tab)).toBe(title);
  });
});
