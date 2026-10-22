'use client';
import React, { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { DateField } from './DateField';
import {
  addDays,
  addMonths,
  formatDateRange,
  getLocalDate,
  getLocalMonth,
  isIsoDate,
  monthRange,
  type DateRange,
} from '../../utils/date';

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

function presets(): { id: string; label: string; range: DateRange }[] {
  const today = getLocalDate();
  const month = getLocalMonth();
  return [
    { id: 'this-month', label: 'This month', range: monthRange(month) },
    { id: 'last-month', label: 'Last month', range: monthRange(addMonths(month, -1)) },
    { id: 'last-30', label: 'Last 30 days', range: { from: addDays(today, -29), to: today } },
    { id: 'last-90', label: 'Last 90 days', range: { from: addDays(today, -89), to: today } },
    { id: 'this-year', label: 'This year', range: { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` } },
    { id: 'last-year', label: 'Last year', range: { from: `${Number(today.slice(0, 4)) - 1}-01-01`, to: `${Number(today.slice(0, 4)) - 1}-12-31` } },
  ];
}

/** Same look as MonthPicker, but picks an inclusive from–to range. */
export function DateRangePicker({
  value,
  onChange,
  size = 'md',
  className = '',
  'aria-label': ariaLabel = 'Select date range',
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const [error, setError] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const openPopover = () => {
    setDraft(value);
    setError('');
    setOpen(true);
  };

  const apply = (range: DateRange) => {
    if (!isIsoDate(range.from) || !isIsoDate(range.to)) {
      setError('Choose both a start and an end date.');
      return;
    }
    if (range.from > range.to) {
      setError('Start date must be on or before the end date.');
      return;
    }
    onChange(range);
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

  const onRootKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      close();
    }
  };

  const presetList = presets();
  const label = formatDateRange(value);

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`.trim()} onKeyDown={onRootKeyDown}>
      <div className="inline-flex items-center p-1 rounded-xl bg-surface-hover border border-border">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? close() : openPopover())}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? dialogId : undefined}
          aria-label={`${ariaLabel}: ${label}`}
          className={`inline-flex items-center gap-1.5 rounded-lg font-semibold text-text hover:bg-surface transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${size === 'sm' ? 'h-7 px-2 text-xs' : 'h-8 px-2.5 text-sm'}`}
        >
          <Icon name="calendar" size={size === 'sm' ? 14 : 16} className="text-muted" />
          <span className="num">{label}</span>
          <Icon name="chevron-down" size={14} className="text-muted" />
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
            aria-label="Choose date range"
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-border bg-surface p-4 pb-6 shadow-xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:rounded-2xl sm:pb-4"
          >
            <div className="grid grid-cols-2 gap-1.5">
              {presetList.map(p => {
                const isSelected = p.range.from === value.from && p.range.to === value.to;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => apply(p.range)}
                    className={`h-9 rounded-xl text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                      isSelected ? 'bg-primary-600 text-white shadow-sm' : 'text-text hover:bg-surface-hover border border-border'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 border-t border-border pt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted">From</span>
                  <DateField
                    value={draft.from}
                    max={draft.to || undefined}
                    onChange={e => {
                      setDraft(d => ({ ...d, from: e.target.value }));
                      setError('');
                    }}
                    hasError={Boolean(error)}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted">To</span>
                  <DateField
                    value={draft.to}
                    min={draft.from || undefined}
                    onChange={e => {
                      setDraft(d => ({ ...d, to: e.target.value }));
                      setError('');
                    }}
                    hasError={Boolean(error)}
                  />
                </label>
              </div>
              {error && <p role="alert" className="text-xs font-medium text-danger-text">{error}</p>}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => close()}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:text-text hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => apply(draft)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
