import { describe, expect, it, vi, beforeEach } from 'vitest';
import { persistStoreAction } from './storeApi';

describe('storeApi loan mapping and readonly field stripping (1.2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('ADD_LOAN maps principal to amount and does not send readonly fields to backend', async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;
    let capturedBody: any;

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method;
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ data: { _id: 'loan_123' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const id = await persistStoreAction({
      type: 'ADD_LOAN',
      entry: {
        id: 'temp_local_id',
        lender: 'Commercial Bank',
        principal: 100000,
        rate: 12,
        method: 'reducing_balance',
        startDate: '2026-01-01',
        dueDate: '2027-01-01',
        interestBasis: 'annual',
        tenureMonths: 12,
        balance: 100000,
        monthlyPayment: 8884.88,
        totalInterest: 6618.55,
        repayments: [],
      },
    });

    expect(id).toBe('loan_123');
    expect(capturedUrl).toContain('/api/backend/records/loans');
    expect(capturedMethod).toBe('POST');
    expect(capturedBody).toEqual({
      lender: 'Commercial Bank',
      amount: 100000,
      rate: 12,
      method: 'reducing_balance',
      startDate: '2026-01-01',
      dueDate: '2027-01-01',
      interestBasis: 'annual',
      tenureMonths: 12,
    });
    // Ensure readonly fields were not sent
    expect(capturedBody.id).toBeUndefined();
    expect(capturedBody.principal).toBeUndefined();
    expect(capturedBody.balance).toBeUndefined();
    expect(capturedBody.monthlyPayment).toBeUndefined();
    expect(capturedBody.totalInterest).toBeUndefined();
    expect(capturedBody.repayments).toBeUndefined();
  });

  it('UPDATE_LOAN maps principal to amount and strips readonly fields on update', async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;
    let capturedBody: any;

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method;
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ data: { _id: 'loan_123' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await persistStoreAction({
      type: 'UPDATE_LOAN',
      entry: {
        id: 'loan_123',
        lender: 'Commercial Bank PLC',
        principal: 150000,
        rate: 14,
        method: 'simple',
        startDate: '2026-01-01',
        dueDate: '2027-01-01',
        interestBasis: 'annual',
        tenureMonths: 24,
        balance: 130000,
        monthlyPayment: 8000,
        totalInterest: 42000,
        repayments: [{ date: '2026-02-01', amount: 20000, note: 'repaid' }],
      },
    });

    expect(capturedUrl).toContain('/api/backend/records/loans/loan_123');
    expect(capturedMethod).toBe('PATCH');
    expect(capturedBody).toEqual({
      lender: 'Commercial Bank PLC',
      amount: 150000,
      rate: 14,
      method: 'simple',
      startDate: '2026-01-01',
      dueDate: '2027-01-01',
      interestBasis: 'annual',
      tenureMonths: 24,
    });
    // Verify readonly fields are stripped
    expect(capturedBody.id).toBeUndefined();
    expect(capturedBody.principal).toBeUndefined();
    expect(capturedBody.balance).toBeUndefined();
    expect(capturedBody.monthlyPayment).toBeUndefined();
    expect(capturedBody.totalInterest).toBeUndefined();
    expect(capturedBody.repayments).toBeUndefined();
  });
});
