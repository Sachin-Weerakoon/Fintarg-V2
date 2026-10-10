'use client';
import React from 'react';
import { Field } from './Field';

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'card'
  | 'cheque'
  | 'standing_order'
  | 'online'
  | 'other';

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card (Debit / Credit)' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'standing_order', label: 'Standing Order' },
  { value: 'online', label: 'Online / App' },
  { value: 'other', label: 'Other' },
];

export interface PaymentMethodFieldProps {
  id?: string;
  label?: string;
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  allowedMethods?: PaymentMethod[];
  hasError?: boolean;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function PaymentMethodField({
  id = 'payment-method',
  label = 'Payment Method',
  value,
  onChange,
  allowedMethods,
  hasError = false,
  hint,
  error,
  disabled = false,
  className = '',
}: PaymentMethodFieldProps) {
  const isOtherCategory = ['cheque', 'standing_order', 'online', 'other'].includes(value);

  const boxes: {
    key: string;
    value: PaymentMethod;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    matches: boolean;
  }[] = [
    {
      key: 'bank',
      value: 'bank_transfer',
      label: 'Link Bank',
      sublabel: 'Savings / Current',
      matches: value === 'bank_transfer',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="21" x2="21" y2="21" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <polyline points="5 6 12 3 19 6" />
          <line x1="4" y1="10" x2="4" y2="21" />
          <line x1="20" y1="10" x2="20" y2="21" />
          <line x1="8" y1="14" x2="8" y2="17" />
          <line x1="12" y1="14" x2="12" y2="17" />
          <line x1="16" y1="14" x2="16" y2="17" />
        </svg>
      ),
    },
    {
      key: 'card',
      value: 'card',
      label: 'Card',
      sublabel: 'Debit / Credit',
      matches: value === 'card',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    {
      key: 'cash',
      value: 'cash',
      label: 'Cash',
      sublabel: 'Physical notes',
      matches: value === 'cash',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="2" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
      ),
    },
    {
      key: 'other',
      value: isOtherCategory ? value : 'other',
      label: 'Other Types',
      sublabel: isOtherCategory ? value.replace('_', ' ') : 'Cheque / Online',
      matches: isOtherCategory,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      ),
    },
  ];

  const visibleBoxes = allowedMethods
    ? boxes.filter(b => allowedMethods.includes(b.value) || (b.key === 'other' && allowedMethods.some(m => ['cheque', 'standing_order', 'online', 'other'].includes(m))))
    : boxes;

  const otherSubOptions = ([
    { value: 'other' as const, label: 'General Other' },
    { value: 'cheque' as const, label: 'Cheque' },
    { value: 'standing_order' as const, label: 'Standing Order' },
    { value: 'online' as const, label: 'Online / App' },
  ] satisfies { value: PaymentMethod; label: string }[]).filter(
    opt => !allowedMethods || allowedMethods.includes(opt.value)
  );

  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      <div className="space-y-2.5">
        <div
          id={id}
          role="radiogroup"
          aria-label={label}
          className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 ${hasError ? 'ring-1 ring-danger-solid rounded-xl p-1' : ''}`}
        >
          {visibleBoxes.map(box => {
            const isSelected = box.matches;
            return (
              <button
                key={box.key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => onChange(box.value)}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 select-none outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${
                  disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${
                  isSelected
                    ? 'border-primary-500 bg-primary-tint/20 ring-1 ring-primary-500/40 shadow-sm text-text'
                    : 'border-border bg-surface hover:bg-surface-hover hover:border-border/80 text-muted'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface-hover text-muted'
                    }`}
                  >
                    {box.icon}
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500 text-white text-[10px] font-bold'
                        : 'border-border'
                    }`}
                  >
                    {isSelected && '✓'}
                  </div>
                </div>
                <div>
                  <div className={`text-xs font-semibold ${isSelected ? 'text-text' : 'text-text-2'}`}>
                    {box.label}
                  </div>
                  <div className="text-[10px] text-muted truncate capitalize">
                    {box.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Sub-options when "Other Types" is chosen */}
        {isOtherCategory && (
          <div className="p-2.5 rounded-xl bg-surface-hover/70 border border-border/80 flex flex-wrap items-center gap-1.5 animate-fade-in">
            <span className="text-[11px] font-medium text-muted mr-1">Specific type:</span>
            {otherSubOptions.map(sub => (
              <button
                key={sub.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange(sub.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  value === sub.value
                    ? 'bg-primary-500 text-white shadow-xs'
                    : 'bg-surface text-text border border-border hover:bg-surface-hover'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </Field>
  );
}
