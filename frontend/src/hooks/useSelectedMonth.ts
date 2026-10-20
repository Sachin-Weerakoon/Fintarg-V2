'use client';
import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/store';
import { getLocalMonth, isMonthKey } from '@/utils/date';

/**
 * The month every page filters by.
 * Source of truth: state.selectedMonth (store). The URL `?month=YYYY-MM` mirrors it so a
 * reload, a shared link and browser back/forward keep the same month.
 */
export function useSelectedMonth(): [string, (month: string) => void] {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const rawUrlMonth = searchParams.get('month');
  const urlMonth = isMonthKey(rawUrlMonth) ? rawUrlMonth : null;
  const storeMonth = state.selectedMonth;
  // Month we just wrote to the URL; router.replace is async, so until the URL shows it
  // the old ?month must not be copied back into the store.
  const pendingUrlMonth = useRef<string | null>(null);

  const replaceUrlMonth = useCallback((month: string) => {
    pendingUrlMonth.current = month;
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', month);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (pendingUrlMonth.current) {
      if (urlMonth !== pendingUrlMonth.current) return;
      pendingUrlMonth.current = null;
    }
    if (urlMonth) {
      // URL -> store (deep link, reload, back/forward).
      if (urlMonth !== storeMonth) void dispatch({ type: 'SET_MONTH', month: urlMonth });
    } else if (storeMonth !== getLocalMonth()) {
      // Store -> URL when arriving from another page with a non-default month.
      replaceUrlMonth(storeMonth);
    }
    // dispatch is recreated on every render by the store, so it is left out on purpose.
  }, [urlMonth, storeMonth, replaceUrlMonth]);

  const setMonth = useCallback((month: string) => {
    if (!isMonthKey(month)) return;
    void dispatch({ type: 'SET_MONTH', month });
    replaceUrlMonth(month);
  }, [replaceUrlMonth]);

  // The store leads while a URL update is in flight; otherwise the URL wins (no flicker on reload).
  const month = pendingUrlMonth.current ? storeMonth : (urlMonth ?? storeMonth);
  return [month, setMonth];
}
