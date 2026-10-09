import { describe, expect, it } from 'vitest';
import { PAYMENT_METHOD_OPTIONS } from './PaymentMethodField';
import { fetchTransactionHistory } from '../../services/storeApi';

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
    // Mock global fetch
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
});
