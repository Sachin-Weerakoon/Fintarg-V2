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
  placeholder = 'Select bank account',
  hasError = false,
  hint,
  error,
  disabled = false,
  required = false,
  className = '',
}: BankSelectProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      <Select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        hasError={hasError || Boolean(error)}
        disabled={disabled || bankAccounts.length === 0}
        required={required}
      >
        <option value="">
          {bankAccounts.length === 0 ? 'No bank accounts available' : placeholder}
        </option>
        {bankAccounts.map(account => {
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
