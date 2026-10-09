import React from 'react';

export interface TabOption<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedTabsProps<T extends string = string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

export function SegmentedTabs<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
}: SegmentedTabsProps<T>) {
  const sizeClasses = {
    sm: 'p-0.5 text-xs gap-1',
    md: 'p-1 text-xs gap-1.5',
  };

  const itemSizeClasses = {
    sm: 'py-1 px-2.5 min-h-[28px] rounded-lg',
    md: 'py-1.5 px-3 min-h-[34px] rounded-xl',
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % options.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + options.length) % options.length;
    }
    if (nextIndex !== -1 && !options[nextIndex].disabled) {
      e.preventDefault();
      onChange(options[nextIndex].id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center rounded-xl bg-surface-hover border border-border ${sizeClasses[size]} ${className}`.trim()}
    >
      {options.map((opt, idx) => {
        const isSelected = value === opt.id;
        return (
          <button
            key={opt.id}
            role="tab"
            type="button"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            disabled={opt.disabled}
            onClick={() => onChange(opt.id)}
            onKeyDown={e => handleKeyDown(e, idx)}
            className={`flex items-center justify-center font-medium transition-all duration-200 select-none ${
              itemSizeClasses[size]
            } ${
              isSelected
                ? 'bg-surface text-text shadow-sm font-semibold border border-border/80'
                : 'text-muted hover:text-text hover:bg-surface/50 border border-transparent'
            } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {opt.icon && <span className="mr-1.5 flex-shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.badge && <span className="ml-1.5 flex-shrink-0">{opt.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
