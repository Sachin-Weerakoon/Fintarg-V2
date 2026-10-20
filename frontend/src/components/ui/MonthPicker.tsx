'use client';
import React, { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { addMonths, clampMonth, defaultMonthBounds, formatMonth, getLocalMonth, parseMonth, toMonthKey } from '../../utils/date';

export interface MonthPickerProps {
  /** Selected month, 'YYYY-MM'. */
  value: string;
  onChange: (month: string) => void;
  /** Earliest selectable month (default: 36 months before the current local month). */
  min?: string;
  /** Latest selectable month (default: the current local month + 1). */
  max?: string;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function MonthPicker({
  value,
  onChange,
  min,
  max,
  size = 'md',
  className = '',
  'aria-label': ariaLabel = 'Select month',
}: MonthPickerProps) {
  const bounds = defaultMonthBounds();
  const lo = min ?? bounds.min;
  const hi = max ?? bounds.max;
  const current = getLocalMonth();
  const selectedYear = parseMonth(value)?.year ?? Number(current.slice(0, 4));

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selectedYear);
  const [focusMonth, setFocusMonth] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const focusPending = useRef(false);
  const dialogId = useId();

  const prev = addMonths(value, -1);
  const next = addMonths(value, 1);
  const canPrev = prev >= lo;
  const canNext = next <= hi;
  const minYear = Number(lo.slice(0, 4));
  const maxYear = Number(hi.slice(0, 4));

  const openPopover = () => {
    const start = clampMonth(value, lo, hi);
    setViewYear(Number(start.slice(0, 4)));
    setFocusMonth(start);
    focusPending.current = true;
    setOpen(true);
  };

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const select = (month: string) => {
    if (month < lo || month > hi) return;
    onChange(month);
    close();
  };

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  // Move DOM focus to the roving month cell after keyboard navigation / opening.
  useEffect(() => {
    if (!open || !focusPending.current) return;
    focusPending.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-month="${focusMonth}"]`)?.focus();
  }, [open, focusMonth, viewYear]);

  const moveFocus = (delta: number) => {
    const target = clampMonth(addMonths(focusMonth, delta), lo, hi);
    focusPending.current = true;
    setFocusMonth(target);
    setViewYear(Number(target.slice(0, 4)));
  };

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const deltas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4, PageUp: -12, PageDown: 12 };
    if (e.key in deltas) {
      e.preventDefault();
      moveFocus(deltas[e.key]);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const target = clampMonth(toMonthKey(viewYear, e.key === 'Home' ? 1 : 12), lo, hi);
      focusPending.current = true;
      setFocusMonth(target);
    }
  };

  const onRootKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      close();
    }
  };

  const chevronClass = `flex items-center justify-center rounded-lg text-muted hover:text-text hover:bg-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'}`;

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`.trim()} onKeyDown={onRootKeyDown}>
      <div className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-surface-hover border border-border">
        <button type="button" className={chevronClass} onClick={() => canPrev && onChange(prev)} disabled={!canPrev} aria-label="Previous month" title="Previous month">
          <Icon name="chevron-left" size={16} />
        </button>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? close() : openPopover())}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? dialogId : undefined}
          aria-label={`${ariaLabel}: ${formatMonth(value, 'long')}`}
          className={`inline-flex items-center gap-1.5 rounded-lg font-semibold text-text hover:bg-surface transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${size === 'sm' ? 'h-7 px-2 text-xs' : 'h-8 px-2.5 text-sm'}`}
        >
          <Icon name="calendar" size={size === 'sm' ? 14 : 16} className="text-muted" />
          <span className="num min-w-[64px] text-center">{formatMonth(value)}</span>
        </button>
        <button type="button" className={chevronClass} onClick={() => canNext && onChange(next)} disabled={!canNext} aria-label="Next month" title="Next month">
          <Icon name="chevron-right" size={16} />
        </button>
      </div>

      {open && (
        <>
          {/* Mobile: dimmed backdrop + bottom sheet. sm+: popover under the trigger. */}
          <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" aria-hidden="true" onClick={() => close(false)} />
          <div
            id={dialogId}
            role="dialog"
            aria-modal="false"
            aria-label="Choose month"
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-border bg-surface p-4 pb-6 shadow-xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 sm:rounded-2xl sm:pb-4"
          >
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                className={chevronClass}
                onClick={() => setViewYear(y => y - 1)}
                disabled={viewYear <= minYear}
                aria-label="Previous year"
              >
                <Icon name="chevron-left" size={16} />
              </button>
              <div className="text-sm font-bold text-text num" aria-live="polite">{viewYear}</div>
              <button
                type="button"
                className={chevronClass}
                onClick={() => setViewYear(y => y + 1)}
                disabled={viewYear >= maxYear}
                aria-label="Next year"
              >
                <Icon name="chevron-right" size={16} />
              </button>
            </div>

            {/* Roving tabindex: the focused month, else the first selectable month of the shown year. */}
            <div ref={gridRef} role="group" aria-label={`Months of ${viewYear}`} className="grid grid-cols-4 gap-1.5" onKeyDown={onGridKeyDown}>
              {(() => {
                const yearHasFocus = focusMonth.startsWith(`${viewYear}-`);
                const firstEnabled = MONTH_SHORT.map((_, i) => toMonthKey(viewYear, i + 1)).find(k => k >= lo && k <= hi);
                return MONTH_SHORT.map((label, i) => {
                const key = toMonthKey(viewYear, i + 1);
                const disabled = key < lo || key > hi;
                const isSelected = key === value;
                const isCurrent = key === current;
                const isFocusable = yearHasFocus ? key === focusMonth : key === firstEnabled;
                return (
                  <button
                    key={key}
                    type="button"
                    data-month={key}
                    tabIndex={isFocusable ? 0 : -1}
                    disabled={disabled}
                    aria-pressed={isSelected}
                    aria-current={isCurrent ? 'date' : undefined}
                    aria-label={formatMonth(key, 'long')}
                    onClick={() => select(key)}
                    onFocus={() => setFocusMonth(key)}
                    className={`h-10 rounded-xl text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                      isSelected
                        ? 'bg-primary-600 text-white shadow-sm'
                        : isCurrent
                        ? 'border border-primary-500 text-primary-text hover:bg-surface-hover'
                        : 'text-text hover:bg-surface-hover'
                    } ${disabled ? 'opacity-35 cursor-not-allowed hover:bg-transparent' : 'cursor-pointer'}`}
                  >
                    {label}
                  </button>
                );
              });
              })()}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => select(clampMonth(current, lo, hi))}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary-text hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                This month
              </button>
              <button
                type="button"
                onClick={() => close()}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:text-text hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
