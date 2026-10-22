'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/store';
import { useToast } from '@/components/ui/ToastProvider';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { buildInsights, upcomingObligations, todayISO, type Insight, type InsightCategory, type InsightSeverity } from '@/lib/insights';

const DISMISS_KEY = 'fintarg.insights.dismissed.v1';
const TOASTED_KEY = 'fintarg.insights.toasted.v1';
const PRUNE_AFTER_MS = 45 * 24 * 3600 * 1000;

const SEVERITY: Record<InsightSeverity, { accent: string; chip: string; label: string }> = {
  critical: { accent: 'bg-rose-400', chip: 'bg-rose-400/15 text-rose-300 border-rose-400/30', label: 'Urgent' },
  warning: { accent: 'bg-amber-400', chip: 'bg-amber-400/15 text-amber-300 border-amber-400/30', label: 'Heads up' },
  info: { accent: 'bg-primary-400', chip: 'bg-primary-400/15 text-primary-300 border-primary-400/30', label: 'Insight' },
  success: { accent: 'bg-emerald-400', chip: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30', label: 'Win' },
};

const CATEGORY_ICON: Record<InsightCategory, IconName> = {
  cashflow: 'analysis',
  spending: 'credit-card',
  bills: 'calendar',
  goals: 'target',
  debt: 'bank',
  savings: 'wallet',
  data: 'info',
};

type Filter = 'all' | 'alerts' | 'bills' | 'goals';

function readDismissed(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    const now = Date.now();
    return Object.fromEntries(Object.entries(parsed).filter(([, ts]) => now - ts < PRUNE_AFTER_MS));
  } catch {
    return {};
  }
}

export function NotificationCenter({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [dismissed, setDismissed] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [ringing, setRinging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toastedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(readDismissed());
    try {
      const raw = window.sessionStorage.getItem(TOASTED_KEY);
      toastedRef.current = new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      toastedRef.current = new Set();
    }
    setReady(true);
  }, []);

  const persistDismissed = useCallback((next: Record<string, number>) => {
    setDismissed(next);
    try {
      window.localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      /* storage may be unavailable (private mode) — dismissal just won't persist */
    }
  }, []);

  const today = todayISO();
  const insights = useMemo(() => buildInsights(state, today), [state, today]);
  const visible = useMemo(() => insights.filter(i => !dismissed[i.id]), [insights, dismissed]);
  const unread = visible.filter(i => i.severity !== 'success' && i.category !== 'data');
  const critical = unread.filter(i => i.severity === 'critical').length;
  const upcoming = useMemo(() => upcomingObligations(state, today, 30).filter(o => o.daysUntil >= 0).slice(0, 5), [state, today]);

  const filtered = visible.filter(i => {
    if (filter === 'alerts') return i.severity === 'critical' || i.severity === 'warning';
    if (filter === 'bills') return i.category === 'bills';
    if (filter === 'goals') return i.category === 'goals' || i.category === 'savings';
    return true;
  });

  /* One-time-per-session toasts for the most important new alerts. */
  useEffect(() => {
    if (!ready) return;
    const fresh = visible.filter(i => (i.severity === 'critical' || i.severity === 'warning') && i.category !== 'data' && !toastedRef.current.has(i.id)).slice(0, 2);
    if (!fresh.length) return;
    const timer = setTimeout(() => {
      fresh.forEach((i, idx) => {
        setTimeout(() => toast.show(i.message, i.severity === 'critical' ? 'error' : 'warning', { title: i.title, href: i.href, actionLabel: i.actionLabel, duration: 7000 }), idx * 600);
        toastedRef.current.add(i.id);
      });
      try {
        window.sessionStorage.setItem(TOASTED_KEY, JSON.stringify([...toastedRef.current]));
      } catch {
        /* ignore */
      }
      setRinging(true);
      setTimeout(() => setRinging(false), 1400);
    }, 1500);
    return () => clearTimeout(timer);
  }, [visible, ready, toast]);

  /* Close on outside click / Escape. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const dismiss = (insight: Insight) => {
    if (insight.reminderId) void dispatch({ type: 'UPDATE_REMINDER', id: insight.reminderId, status: 'dismissed' });
    persistDismissed({ ...dismissed, [insight.id]: Date.now() });
  };

  const dismissAll = () => {
    const next = { ...dismissed };
    visible.forEach(i => {
      next[i.id] = Date.now();
    });
    persistDismissed(next);
  };

  const buttonClass =
    variant === 'dark'
      ? '!text-white !border-white/20 !bg-white/5 hover:!bg-white/10'
      : '!text-text !border-border !bg-surface hover:!bg-surface-hover';

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'bills', label: 'Bills' },
    { id: 'goals', label: 'Goals' },
  ];

  return (
    <div className="relative" ref={rootRef}>
      <Button
        variant="ghost"
        id="notification-bell"
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications${unread.length ? `, ${unread.length} new` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative !w-10 !h-10 !min-w-0 !min-h-0 !p-0 !rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 ${buttonClass}`}
      >
        <span className={ringing ? 'animate-bell-ring inline-flex' : 'inline-flex'}>
          <Icon name="bell" size={18} />
        </span>
        {unread.length > 0 && (
          <span
            className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white shadow-md ring-2 ${
              variant === 'dark' ? 'ring-[#0B1626]' : 'ring-[var(--color-surface)]'
            } ${critical ? 'bg-rose-500' : 'bg-primary-600'}`}
          >
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="glass-panel animate-fade-in fixed left-3 right-3 top-[64px] md:absolute md:left-auto md:right-0 md:top-[calc(100%+10px)] md:w-[420px] z-50 rounded-2xl overflow-hidden text-white"
        >
          <div className="px-4 pt-4 pb-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold tracking-tight flex items-center gap-2">
                  Smart notifications
                  {unread.length > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-400/15 text-primary-300 border border-primary-400/30">{unread.length} new</span>}
                </div>
              </div>
              {visible.length > 0 && (
                <Button variant="link" onClick={dismissAll} className="!text-[11px] !text-white/60 hover:!text-white">
                  Clear all
                </Button>
              )}
            </div>
            <div className="flex gap-1.5 mt-3">
              {filters.map(f => (
                <Chip key={f.id} tone="dark" selected={filter === f.id} onClick={() => setFilter(f.id)} className="!px-2.5 text-[11px]">
                  {f.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="max-h-[min(60vh,440px)] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-on-dark-success/10 border border-on-dark-success/25 flex items-center justify-center text-on-dark-success mb-3">
                  <Icon name="check" size={22} />
                </div>
                <div className="text-sm font-semibold">You’re all caught up</div>
                <div className="text-xs text-white/60 mt-1">New predictions and reminders will appear here.</div>
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {filtered.map(i => {
                  const s = SEVERITY[i.severity];
                  return (
                    <li key={i.id} className="relative pl-5 pr-3 py-3 hover:bg-white/[0.03] transition-colors group">
                      <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${s.accent}`} aria-hidden="true" />
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 ${s.chip}`}>
                          <Icon name={CATEGORY_ICON[i.category]} size={15} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-white/60">{s.label}</span>
                          </div>
                          <div className="text-[13px] font-semibold text-white leading-snug mt-0.5">{i.title}</div>
                          <div className="text-xs text-white/80 leading-relaxed mt-0.5">{i.message}</div>
                          <div className="mt-2 flex items-center gap-3">
                            {i.reminderId ? (
                              <Button variant="link" onClick={() => dismiss(i)} className="!text-primary-400 hover:!text-primary-300">
                                Mark done ✓
                              </Button>
                            ) : (
                              i.href && (
                                <Link href={i.href} onClick={() => setOpen(false)} className="text-xs font-semibold text-primary-400 hover:text-primary-300 hover:underline">
                                  {i.actionLabel || 'Open'} →
                                </Link>
                              )
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => dismiss(i)}
                          aria-label={`Dismiss: ${i.title}`}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 !min-w-0 !min-h-0 !p-1 !rounded-md !text-white/45 hover:!text-white hover:!bg-white/10"
                        >
                          ✕
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {upcoming.length > 0 && filter !== 'goals' && (
              <div className="border-t border-white/10 px-4 py-3 bg-white/[0.02]">
                <div className="text-[10px] uppercase tracking-wider font-bold text-white/60 mb-2">Coming up · next 30 days</div>
                <ul className="space-y-1.5">
                  {upcoming.map(o => (
                    <li key={o.id}>
                      <Link href={o.href} onClick={() => setOpen(false)} className="flex items-center justify-between gap-3 text-xs hover:bg-white/5 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${o.daysUntil <= 3 ? 'bg-amber-400' : 'bg-primary-400'}`} />
                          <span className="truncate text-white/90">{o.label}</span>
                        </span>
                        <span className="text-white/60 flex-shrink-0 num">{o.daysUntil === 0 ? 'Today' : o.daysUntil === 1 ? 'Tomorrow' : `in ${o.daysUntil}d`}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Link
            href="/analysis"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-xs font-semibold text-primary-300 hover:bg-white/5 transition-colors"
          >
            <span>Open full analysis & forecast</span>
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
