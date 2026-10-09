'use client';
import React from 'react';
import { Field } from './Field';
import { Select } from './Select';

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
  const options = allowedMethods
    ? PAYMENT_METHOD_OPTIONS.filter(opt => allowedMethods.includes(opt.value))
    : PAYMENT_METHOD_OPTIONS;

  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      <Select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value as PaymentMethod)}
        hasError={hasError || Boolean(error)}
        disabled={disabled}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}
