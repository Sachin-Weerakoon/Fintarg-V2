'use client';
import React, { useState, useEffect } from 'react';

export interface MoneyFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string;
  onChange: (val: number | string, rawValue?: string) => void;
  currency?: string;
  hasError?: boolean;
}

export const MoneyField = React.forwardRef<HTMLInputElement, MoneyFieldProps>(function MoneyField(
  {
    value,
    onChange,
    currency = 'Rs.',
    hasError = false,
    className = '',
    placeholder = '0.00',
    ...props
  },
  ref
) {
  // Format numeric values with thousand separators for display
  const formatValue = (v: number | string) => {
    if (v === '' || v === undefined || v === null) return '';
    const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
    if (isNaN(num)) return String(v);
    const parts = String(v).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
  };

  const [displayValue, setDisplayValue] = useState<string>(() => formatValue(value));

  useEffect(() => {
    setDisplayValue(formatValue(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    // Allow only one decimal point
    const parts = raw.split('.');
    const cleanRaw = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : raw;

    setDisplayValue(cleanRaw);
    onChange(cleanRaw ? (cleanRaw.endsWith('.') ? cleanRaw : cleanRaw) : '', cleanRaw);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const num = parseFloat(displayValue.replace(/,/g, ''));
    if (!isNaN(num)) {
      setDisplayValue(num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
    }
    props.onBlur?.(e);
  };

  return (
    <div className="relative flex items-center w-full">
      <div className="absolute left-3.5 flex items-center pointer-events-none text-muted font-semibold text-xs select-none">
        {currency}
      </div>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`form-input w-full !pl-11 num font-semibold ${
          hasError ? '!border-danger-solid focus:!border-danger-solid' : ''
        } ${className}`.trim()}
        {...props}
      />
    </div>
  );
});
