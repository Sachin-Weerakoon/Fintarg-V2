'use client';

import React, { useState, useMemo } from 'react';
import { Icon } from './Icon';
import { Button } from './Button';
import { Input } from './Input';
import { monthLabel, addMonths } from '../../lib/insights';
import { getLocalMonth } from '../../utils/date';

export type DateFilterPreset = 'all' | 'this-month' | 'last-month' | 'custom';

export interface DateRangeValue {
  type: DateFilterPreset;
  month?: string; // YYYY-MM
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export interface DateRangeFilterProps {
  value?: DateRangeValue;
  onChange?: (val: DateRangeValue) => void;
  // Shortcut props for month-only use
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  // Available months list (e.g. from existing records)
  availableMonths?: string[];
  showAllOption?: boolean;
  showCustomRange?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function DateRangeFilter({
  value,
  onChange,
  selectedMonth: propMonth,
  onMonthChange,
  availableMonths = [],
  showAllOption = true,
  showCustomRange = true,
  className = '',
  size: _size = 'sm',
}: DateRangeFilterProps) {
  const currentMonth = useMemo(() => getLocalMonth(), []);

  // Internal state if uncontrolled
  const activeMonth = propMonth || value?.month || currentMonth;
  const filterType = value?.type || (value === undefined && propMonth ? 'this-month' : 'all');
  const [showCustomInputs, setShowCustomInputs] = useState(filterType === 'custom');
  const [customStart, setCustomStart] = useState(value?.startDate || '');
  const [customEnd, setCustomEnd] = useState(value?.endDate || '');

  // Consolidate months list
  const monthList = useMemo(() => {
    const set = new Set<string>(availableMonths);
    set.add(currentMonth);
    if (activeMonth) set.add(activeMonth);
    return Array.from(set).sort();
  }, [availableMonths, currentMonth, activeMonth]);

  const handlePrevMonth = () => {
    const prev = addMonths(activeMonth, -1);
    if (onMonthChange) onMonthChange(prev);
    if (onChange) {
      onChange({
        type: 'this-month',
        month: prev,
        startDate: `${prev}-01`,
        endDate: `${prev}-31`,
      });
    }
  };

  const handleNextMonth = () => {
    const next = addMonths(activeMonth, 1);
    if (onMonthChange) onMonthChange(next);
    if (onChange) {
      onChange({
        type: 'this-month',
        month: next,
        startDate: `${next}-01`,
        endDate: `${next}-31`,
      });
    }
  };

  const handleMonthSelect = (m: string) => {
    setShowCustomInputs(false);
    if (onMonthChange) onMonthChange(m);
    if (onChange) {
      onChange({
        type: 'this-month',
        month: m,
        startDate: `${m}-01`,
        endDate: `${m}-31`,
      });
    }
  };

  const handlePresetClick = (preset: DateFilterPreset) => {
    if (preset === 'all') {
      setShowCustomInputs(false);
      if (onChange) {
        onChange({ type: 'all' });
      }
    } else if (preset === 'this-month') {
      setShowCustomInputs(false);
      handleMonthSelect(currentMonth);
    } else if (preset === 'last-month') {
      setShowCustomInputs(false);
      const last = addMonths(currentMonth, -1);
      handleMonthSelect(last);
    } else if (preset === 'custom') {
      setShowCustomInputs(true);
      if (onChange) {
        onChange({
          type: 'custom',
          startDate: customStart,
          endDate: customEnd,
        });
      }
    }
  };

  const handleCustomApply = () => {
    if (onChange) {
      onChange({
        type: 'custom',
        startDate: customStart,
        endDate: customEnd,
      });
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Month Stepper Control */}
        <div className="flex items-center bg-surface-hover/80 border border-border rounded-xl p-0.5 shadow-xs">
          <Button
            variant="ghost"
            size="sm"
            className="!p-1.5 text-muted hover:text-text rounded-lg"
            onClick={handlePrevMonth}
            title="Previous month"
            aria-label="Previous month"
          >
            <Icon name="chevron-left" size={14} />
          </Button>

          {/* Month selector dropdown */}
          <div className="relative">
            <select
              value={activeMonth}
              onChange={e => handleMonthSelect(e.target.value)}
              className="appearance-none bg-transparent font-semibold text-xs text-text px-2.5 py-1 pr-6 cursor-pointer hover:text-primary-text transition-colors focus:outline-hidden"
              aria-label="Select month"
            >
              {monthList.map(m => (
                <option key={m} value={m} className="bg-surface text-text">
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-muted">
              <Icon name="chevron-down" size={10} />
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="!p-1.5 text-muted hover:text-text rounded-lg"
            onClick={handleNextMonth}
            title="Next month"
            aria-label="Next month"
          >
            <Icon name="chevron-right" size={14} />
          </Button>
        </div>

        {/* Quick Presets if full filter enabled */}
        {(showAllOption || showCustomRange) && (
          <div className="flex items-center gap-1 bg-surface-hover/50 p-0.5 rounded-xl border border-border">
            {showAllOption && (
              <button
                type="button"
                onClick={() => handlePresetClick('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-primary-solid text-on-primary font-semibold shadow-xs'
                    : 'text-muted hover:text-text'
                }`}
              >
                All Time
              </button>
            )}

            <button
              type="button"
              onClick={() => handlePresetClick('this-month')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                filterType === 'this-month' && activeMonth === currentMonth
                  ? 'bg-primary-solid text-on-primary font-semibold shadow-xs'
                  : 'text-muted hover:text-text'
              }`}
            >
              This Month
            </button>

            {showCustomRange && (
              <button
                type="button"
                onClick={() => handlePresetClick('custom')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  filterType === 'custom' || showCustomInputs
                    ? 'bg-primary-solid text-on-primary font-semibold shadow-xs'
                    : 'text-muted hover:text-text'
                }`}
              >
                Custom Range
              </button>
            )}
          </div>
        )}
      </div>

      {/* Custom Range Inputs Bar */}
      {showCustomInputs && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-surface border border-border shadow-xs animate-in fade-in duration-200">
          <span className="text-[11px] font-semibold text-muted">From:</span>
          <Input
            type="date"
            value={customStart}
            onChange={e => setCustomStart(e.target.value)}
            className="!py-1 !text-xs w-36"
          />
          <span className="text-[11px] font-semibold text-muted">To:</span>
          <Input
            type="date"
            value={customEnd}
            onChange={e => setCustomEnd(e.target.value)}
            className="!py-1 !text-xs w-36"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleCustomApply}
            className="!py-1 !px-3 text-xs"
          >
            Apply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCustomStart('');
              setCustomEnd('');
              handlePresetClick('all');
            }}
            className="!py-1 !px-2 text-xs text-muted hover:text-text"
          >
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}
