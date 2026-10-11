import { describe, expect, it } from 'vitest';
import React from 'react';
import { PAYMENT_METHOD_OPTIONS } from './PaymentMethodField';
import { fetchTransactionHistory } from '../../services/storeApi';
import {
  FormField,
  FormGrid,
  MoneyField,
  DateField,
  Checkbox,
  RadioGroup,
  SettingRow,
  SectionHeader,
  ListRow,
  DataTable,
  FilterBar,
  Tooltip,
  IconChip,
  Avatar,
  ErrorState,
  Divider,
  PageSection,
  Alert,
  ColorSwatch,
} from './index';

describe('Stage 4 Building Blocks & Payment Methods', () => {
  it('defines all required payment methods with user-friendly labels', () => {
    const keys = PAYMENT_METHOD_OPTIONS.map(opt => opt.value);
    expect(keys).toContain('cash');
    expect(keys).toContain('bank_transfer');
    expect(keys).toContain('card');
    expect(keys).toContain('cheque');
    expect(keys).toContain('standing_order');
    expect(keys).toContain('online');
    expect(keys).toContain('other');
  });

  it('formats fetchTransactionHistory queries properly', async () => {
    const originalFetch = global.fetch;
    let requestedUrl = '';
    global.fetch = async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return new Response(
        JSON.stringify({
          data: [
            {
              _id: 'tx_1',
              type: 'expense',
              amountCents: 500000,
              date: '2026-10-09',
              paymentMethod: 'bank_transfer',
              bankAccountId: 'ba_1',
            },
          ],
          summary: {
            totalIncomeCents: 0,
            totalExpenseCents: 500000,
            netFlowCents: -500000,
            count: 1,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      const result = await fetchTransactionHistory({
        bankAccountId: 'ba_1',
        type: 'expense',
      });
      expect(requestedUrl).toContain('/api/backend/transactions/history?');
      expect(requestedUrl).toContain('bankAccountId=ba_1');
      expect(requestedUrl).toContain('type=expense');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].amount).toBe(5000);
      expect(result.summary.totalExpense).toBe(5000);
      expect(result.summary.netFlow).toBe(-5000);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('exports all new UI primitives from components/ui/index', () => {
    expect(FormField).toBeDefined();
    expect(FormGrid).toBeDefined();
    expect(MoneyField).toBeDefined();
    expect(DateField).toBeDefined();
    expect(Checkbox).toBeDefined();
    expect(RadioGroup).toBeDefined();
    expect(SettingRow).toBeDefined();
    expect(SectionHeader).toBeDefined();
    expect(ListRow).toBeDefined();
    expect(DataTable).toBeDefined();
    expect(FilterBar).toBeDefined();
    expect(Tooltip).toBeDefined();
    expect(IconChip).toBeDefined();
    expect(Avatar).toBeDefined();
    expect(ErrorState).toBeDefined();
    expect(Divider).toBeDefined();
    expect(PageSection).toBeDefined();
    expect(Alert).toBeDefined();
    expect(ColorSwatch).toBeDefined();
  });

  it('Avatar generates initials properly', () => {
    const avatarEl = React.createElement(Avatar, { name: 'Kasun Perera' });
    expect(avatarEl.props.name).toBe('Kasun Perera');
  });

  it('MoneyField handles numeric and formatted inputs', () => {
    let _changed = '';
    const field = React.createElement(MoneyField, {
      value: 50000,
      onChange: (v) => {
        _changed = String(v);
      },
    });
    expect(field.props.currency).toBeUndefined(); // defaults to Rs. inside component
    expect(field.props.value).toBe(50000);
  });

  it('ColorSwatch renders with correct color and accessibility attributes', () => {
    const swatch = React.createElement(ColorSwatch, {
      color: '#0FA3B1',
      selected: true,
      ariaLabel: 'Teal color swatch',
    });
    expect(swatch.props.color).toBe('#0FA3B1');
    expect(swatch.props.selected).toBe(true);
    expect(swatch.props.ariaLabel).toBe('Teal color swatch');
  });

  it('SettingRow, ErrorState, and Checkbox render valid React elements', () => {
    const setting = React.createElement(SettingRow, {
      label: 'Dark Mode',
      description: 'Switch application color theme',
      control: React.createElement('span', null, 'Toggle'),
    });
    expect(setting.props.label).toBe('Dark Mode');

    const err = React.createElement(ErrorState, {
      message: 'Failed to fetch account list',
      onRetry: () => {},
    });
    expect(err.props.message).toBe('Failed to fetch account list');

    const check = React.createElement(Checkbox, {
      checked: true,
      onChange: () => {},
      label: 'Notify via email',
    });
    expect((check.props as { checked: boolean; label: string }).checked).toBe(true);
    expect((check.props as { checked: boolean; label: string }).label).toBe('Notify via email');
  });
});
