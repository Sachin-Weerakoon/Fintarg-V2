'use client';
import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { isIsoDate, monthRange, type DateRange } from '@/utils/date';
import { useSelectedMonth } from './useSelectedMonth';

/**
 * The date range a ledger page filters by, mirrored in the URL as `?from=YYYY-MM-DD&to=YYYY-MM-DD`.
 * Without a range in the URL it falls back to the selected month, and picking a range also moves
 * `?month` to the range's end month so month-based pages (dashboard, analysis) stay in step.
 */
export function useSelectedRange(): [DateRange, (range: DateRange) => void] {
  const [month] = useSelectedMonth();
  const router = useRouter();
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const range: DateRange = isIsoDate(from) && isIsoDate(to) && from <= to
    ? { from, to }
    : monthRange(month);

  const setRange = useCallback((next: DateRange) => {
    // One replace for all three params; separate replaces would overwrite each other.
    const params = new URLSearchParams(searchParams.toString());
    params.set('from', next.from);
    params.set('to', next.to);
    params.set('month', next.to.slice(0, 7));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return [range, setRange];
}
