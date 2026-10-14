'use client';
import React from 'react';

export interface CheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  hasError?: boolean;
  name?: string;
  className?: string;
}

export function Checkbox({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  hasError = false,
  name,
  className = '',
}: CheckboxProps) {
  const defaultId = React.useId();
  const generatedId = id || defaultId;

  return (
    <label
      htmlFor={generatedId}
      className={`group flex items-start gap-2.5 select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`.trim()}
    >
      <div className="relative flex items-center justify-center mt-0.5 flex-shrink-0">
        <input
          id={generatedId}
          type="checkbox"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={e => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div
          className={`w-4.5 h-4.5 rounded-[6px] border-[1.5px] transition-all flex items-center justify-center shadow-xs peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/40 peer-focus-visible:ring-offset-2 ${
            checked
              ? 'bg-primary-600 border-primary-600 text-white'
              : hasError
              ? 'border-danger-solid bg-surface'
              : 'border-slate-300 dark:border-slate-600 bg-surface group-hover:border-primary-500'
          }`}
        >
          {checked && (
            <svg
              width="11"
              height="9"
              viewBox="0 0 10 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-in zoom-in-75 duration-100"
            >
              <polyline points="1 4 3.5 6.5 9 1" />
            </svg>
          )}
        </div>
      </div>
      {(label || description) && (
        <div className="space-y-0.5">
          {label && <div className="text-xs font-semibold text-text leading-snug">{label}</div>}
          {description && <div className="text-[11px] text-muted leading-relaxed">{description}</div>}
        </div>
      )}
    </label>
  );
}
