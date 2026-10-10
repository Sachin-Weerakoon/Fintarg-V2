'use client';
import React from 'react';

export interface RadioOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps<T extends string = string> {
  name?: string;
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layout?: 'vertical' | 'horizontal' | 'cards';
  'aria-label'?: string;
  className?: string;
}

export function RadioGroup<T extends string = string>({
  name,
  options,
  value,
  onChange,
  layout = 'vertical',
  'aria-label': ariaLabel,
  className = '',
}: RadioGroupProps<T>) {
  const groupName = name || React.useId();

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      nextIndex = (index + 1) % options.length;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + options.length) % options.length;
    }
    if (nextIndex !== -1 && !options[nextIndex].disabled) {
      e.preventDefault();
      onChange(options[nextIndex].value);
    }
  };

  if (layout === 'cards') {
    return (
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className={`grid gap-3 ${className}`.trim()}
      >
        {options.map((opt, idx) => {
          const isSelected = value === opt.value;
          return (
            <div
              key={opt.value}
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => !opt.disabled && onChange(opt.value)}
              onKeyDown={e => handleKeyDown(e, idx)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-primary-tint/30 border-primary-500 ring-1 ring-primary-500/50 shadow-sm'
                  : 'bg-surface border-border hover:bg-surface-hover hover:border-border-input'
              } ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-xs text-text">{opt.label}</span>
                <div className="flex items-center gap-2">
                  {opt.badge}
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-primary-600 bg-primary-600 text-on-primary font-bold text-[10px]'
                        : 'border-border-input bg-surface'
                    }`}
                  >
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-on-primary" />
                    )}
                  </div>
                </div>
              </div>
              {opt.description && (
                <p className="text-[11px] text-muted leading-relaxed">{opt.description}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`space-y-2.5 ${layout === 'horizontal' ? 'flex flex-wrap items-center gap-4 space-y-0' : ''} ${className}`.trim()}
    >
      {options.map((opt, idx) => {
        const isSelected = value === opt.value;
        const optId = `${groupName}-${opt.value}`;
        return (
          <label
            key={opt.value}
            htmlFor={optId}
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onKeyDown={e => handleKeyDown(e, idx)}
            className={`flex items-start gap-2.5 select-none ${
              opt.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <input
              id={optId}
              type="radio"
              name={groupName}
              value={opt.value}
              checked={isSelected}
              disabled={opt.disabled}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 transition-colors ${
                isSelected
                  ? 'border-primary-600 bg-primary-600'
                  : 'border-border-input bg-surface hover:border-primary-600'
              }`}
            >
              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-on-primary" />}
            </div>
            <div>
              <div className="text-xs font-semibold text-text flex items-center gap-2">
                <span>{opt.label}</span>
                {opt.badge}
              </div>
              {opt.description && (
                <div className="text-[11px] text-muted mt-0.5">{opt.description}</div>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
