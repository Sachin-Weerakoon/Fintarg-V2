'use client';
import React, { useState, useEffect } from 'react';

export interface MoneyFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string;
  onChange: (val: number | string, rawValue?: string) => void;
  currency?: string;
  hasError?: boolean;
  allowNegative?: boolean;
}

/**
 * Sanitizes raw money input:
 * - strips non-numeric characters (except single decimal point)
 * - enforces 2-decimal maximum precision
 * - rejects negative values unless allowNegative is true
 */
export function sanitizeMoneyInput(raw: string, allowNegative = false): string {
  const isNeg = allowNegative && raw.trim().startsWith('-');
  const digitsOnly = raw.replace(/[^0-9.]/g, '');
  const parts = digitsOnly.split('.');
  let cleanRaw = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : digitsOnly;

  if (cleanRaw.includes('.')) {
    const [intPart, decPart] = cleanRaw.split('.');
    cleanRaw = `${intPart}.${decPart.slice(0, 2)}`;
  }

  return isNeg && cleanRaw ? `-${cleanRaw}` : cleanRaw;
}

/**
 * Formats a money value for display with thousand separators.
 * Rejects NaN, infinite, and unallowed negative values.
 */
export function formatMoneyValue(v: number | string, allowNegative = false): string {
  if (v === '' || v === undefined || v === null) return '';
  const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  if (isNaN(num) || !isFinite(num)) return '';
  if (!allowNegative && num < 0) return '0.00';
  const rounded = Math.round(num * 100) / 100;
  const parts = String(rounded).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
}

export const MoneyField = React.forwardRef<HTMLInputElement, MoneyFieldProps>(function MoneyField(
  {
    value,
    onChange,
    currency = 'Rs.',
    hasError = false,
    allowNegative = false,
    className = '',
    placeholder = '0.00',
    ...props
  },
  ref
) {
  const [displayValue, setDisplayValue] = useState<string>(() => formatMoneyValue(value, allowNegative));

  useEffect(() => {
    setDisplayValue(formatMoneyValue(value, allowNegative));
  }, [value, allowNegative]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanRaw = sanitizeMoneyInput(e.target.value, allowNegative);
    setDisplayValue(cleanRaw);
    onChange(cleanRaw, cleanRaw);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const cleanStr = displayValue.replace(/,/g, '');
    const num = parseFloat(cleanStr);
    if (!isNaN(num) && isFinite(num)) {
      if (!allowNegative && num < 0) {
        setDisplayValue('0.00');
        onChange(0, '0.00');
      } else {
        const rounded = Math.round(num * 100) / 100;
        setDisplayValue(
          rounded.toLocaleString('en-LK', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })
        );
        onChange(rounded, String(rounded));
      }
    } else {
      setDisplayValue('');
      onChange('', '');
    }
    props.onBlur?.(e);
  };

    return (
    <div className="group relative flex items-center w-full">
      <div className="absolute left-2.5 flex items-center pointer-events-none select-none z-10">
        <span className="px-2 py-0.5 rounded-md bg-primary-tint/70 dark:bg-primary-tint/25 text-primary-text font-bold text-[11px] uppercase tracking-wider border border-primary-500/25 transition-colors duration-200 group-focus-within:border-primary-500 group-focus-within:bg-primary-tint">
          {currency}
        </span>
      </div>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`form-input w-full !pl-14 num font-bold text-text transition-all duration-200 ${
          hasError
            ? '!border-danger-solid focus:!border-danger-solid focus:!ring-4 focus:!ring-danger-solid/15 !shadow-[0_0_0_1px_rgba(220,38,38,0.2)]'
            : ''
        } ${className}`.trim()}
        {...props}
      />
    </div>
  );
});
