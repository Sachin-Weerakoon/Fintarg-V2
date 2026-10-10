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
  const generatedId = id || React.useId();

  return (
    <label
      htmlFor={generatedId}
      className={`flex items-start gap-3 select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`.trim()}
    >
      <div className="relative flex items-center justify-center mt-0.5">
        <input
          id={generatedId}
          type="checkbox"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={e => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
            checked
              ? 'bg-primary-600 border-primary-600 text-on-primary'
              : hasError
              ? 'border-danger-solid bg-surface'
              : 'border-border-input bg-surface hover:border-primary-600'
          }`}
        >
          {checked && (
            <svg
              width="10"
              height="8"
              viewBox="0 0 10 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="1 4 3.5 6.5 9 1" />
            </svg>
          )}
        </div>
      </div>
      {(label || description) && (
        <div className="space-y-0.5">
          {label && <div className="text-xs font-semibold text-text">{label}</div>}
          {description && <div className="text-[11px] text-muted">{description}</div>}
        </div>
      )}
    </label>
  );
}
