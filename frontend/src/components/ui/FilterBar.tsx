'use client';
import React from 'react';
import { Icon } from './Icon';

export interface FilterChip {
  id: string;
  label: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count?: number;
}

export interface FilterBarProps {
  search?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  chips?: FilterChip[];
  onClearAll?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  chips,
  onClearAll,
  actions,
  className = '',
}: FilterBarProps) {
  const hasActiveChips = chips?.some(c => c.active);
  const showClear = Boolean(onClearAll && (hasActiveChips || Boolean(search)));

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-surface ${className}`.trim()}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
        {onSearchChange !== undefined && (
          <div className="relative flex-1 sm:max-w-xs min-w-[180px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              <Icon name="search" size={14} />
            </div>
            <input
              type="text"
              value={search || ''}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="form-input !h-9 !py-1.5 !pl-8.5 !pr-3 text-xs w-full"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text text-xs p-0.5"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {chips && chips.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {chips.map(chip => (
              <button
                key={chip.id}
                type="button"
                onClick={chip.onClick}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all select-none whitespace-nowrap cursor-pointer ${
                  chip.active
                    ? 'bg-primary-600 text-on-primary font-semibold shadow-sm'
                    : 'bg-surface-hover text-muted hover:text-text border border-border'
                }`}
              >
                <span>{chip.label}</span>
                {chip.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      chip.active ? 'bg-white/20 text-white' : 'bg-border text-text'
                    }`}
                  >
                    {chip.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {showClear && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-semibold text-primary-text hover:underline px-1 py-1 whitespace-nowrap cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
