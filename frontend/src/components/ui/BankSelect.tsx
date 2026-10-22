'use client';
import React from 'react';
import { Field } from './Field';
import { Select } from './Select';
import type { BankAccount } from '@/types';

export interface BankSelectProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (bankAccountId: string) => void;
  bankAccounts?: BankAccount[];
  /** Only list accounts of these types (e.g. current accounts for cheques and standing orders). */
  accountTypes?: NonNullable<BankAccount['accountType']>[];
  placeholder?: string;
  hasError?: boolean;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function BankSelect({
  id = 'bank-select',
  label = 'Bank Account',
  value,
  onChange,
  bankAccounts = [],
  accountTypes,
  placeholder = 'Select bank account',
  hasError = false,
  hint,
  error,
  disabled = false,
  required = false,
  className = '',
}: BankSelectProps) {
  // Archived or off-type accounts accept no new links; keep one only if it is already the selected value.
  const selectable = bankAccounts.filter(account => account.id === value || (
    !account.isArchived && (!accountTypes || accountTypes.includes(account.accountType || 'savings'))
  ));
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <Select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        hasError={hasError || Boolean(error)}
        disabled={disabled || selectable.length === 0}
        required={required}
      >
        <option value="">
          {selectable.length === 0 ? 'No bank accounts available' : placeholder}
        </option>
        {selectable.map(account => {
          const lastFour = account.accountNumber ? account.accountNumber.slice(-4) : '----';
          return (
            <option key={account.id} value={account.id}>
              {account.bankName} - {account.name} (•••• {lastFour})
            </option>
          );
        })}
      </Select>
    </Field>
  );
}
