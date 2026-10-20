import mongoose from 'mongoose';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errors';
import { addGoalContribution, calculateLoanPayoff, createRecord, createTransferRecord, deleteFinancePaymentPayment, deleteGoalContribution, deleteLoanRepayment, deletePawnPayment, deleteRecord, deleteTransferRecord, getTransactionHistory, listRecords, recordFinancePayment, recordLoanRepayment, recordPawnPayment, updateRecord } from '../services/recordService';
import { optionalIsoDateSchema, paymentMethodEnum, recordKinds, recordSchemas, recordUpdateSchemas, type RecordKind } from '../validations/records';
import { asyncHandler } from '../utils/asyncHandler';

function getKind(value: string): RecordKind {
  if (!recordKinds.includes(value as RecordKind)) throw new HttpError(404, 'Unknown record type');
  return value as RecordKind;
}

export const list: RequestHandler = asyncHandler(async (request, response) => {
  const kind = getKind(request.params.kind);
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  response.json({ data: await listRecords(kind, userId) });
});

export const create: RequestHandler = asyncHandler(async (request, response) => {
  const kind = getKind(request.params.kind);
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const input = recordSchemas[kind].parse(request.body);
  response.status(201).json({ data: await createRecord(kind, userId, input as Record<string, unknown>) });
});

export const update: RequestHandler = asyncHandler(async (request, response) => {
  const kind = getKind(request.params.kind);
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  if (!mongoose.isValidObjectId(request.params.id)) throw new HttpError(400, 'Invalid record id');
  const input = recordUpdateSchemas[kind].parse(request.body);
  response.json({ data: await updateRecord(kind, userId, request.params.id, input as Record<string, unknown>) });
});

export const remove: RequestHandler = asyncHandler(async (request, response) => {
  const kind = getKind(request.params.kind);
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  await deleteRecord(kind, userId, request.params.id);
  response.json({ ok: true });
});

export const contribute: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const schema = z.object({
    amount: z.coerce.number().positive(),
    date: optionalIsoDateSchema.optional(),
    note: z.string().optional(),
    debitAccount: z.boolean().optional().default(false),
    paymentMethod: paymentMethodEnum.optional().default('cash'),
    bankAccountId: z.string().optional().nullable(),
  }).superRefine((data, ctx) => {
    if (data.debitAccount) {
      const method = data.paymentMethod;
      if (['debit_card', 'bank_transfer', 'cheque', 'standing_order'].includes(method)) {
        if (!data.bankAccountId || data.bankAccountId.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Bank account is required for ${method.replace('_', ' ')} contributions`,
            path: ['bankAccountId'],
          });
        }
      }
    }
  });
  const parsed = schema.parse(request.body);
  response.json({ data: await addGoalContribution(userId, request.params.id, parsed) });
});

export const undoContribution: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  response.json({ data: await deleteGoalContribution(userId, request.params.id, request.params.contributionId) });
});

export const repayLoan: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const schema = z.object({
    amount: z.coerce.number().positive(),
    date: optionalIsoDateSchema.optional(),
    note: z.string().optional(),
    paymentMethod: paymentMethodEnum.optional().default('cash'),
    bankAccountId: z.string().optional().nullable(),
  }).superRefine((data, ctx) => {
    const method = data.paymentMethod;
    if (['debit_card', 'bank_transfer', 'cheque', 'standing_order'].includes(method)) {
      if (!data.bankAccountId || data.bankAccountId.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Bank account is required for ${method.replace('_', ' ')} repayments`,
          path: ['bankAccountId'],
        });
      }
    }
  });
  const { amount, date, note, paymentMethod, bankAccountId } = schema.parse(request.body);
  response.json({
    data: await recordLoanRepayment(
      userId,
      request.params.id,
      amount,
      date,
      note,
      paymentMethod,
      bankAccountId,
    ),
  });
});

export const undoLoanRepayment: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  response.json({
    data: await deleteLoanRepayment(userId, request.params.id, request.params.repaymentId),
  });
});

export const getLoanPayoff: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  response.json({
    data: await calculateLoanPayoff(userId, request.params.id, typeof request.query.date === 'string' ? request.query.date : undefined),
  });
});

export const payPawnInterest: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const schema = z.object({
    amount: z.coerce.number().positive().optional(),
    paymentType: z.enum(['interest', 'part_principal', 'redemption']).optional().default('interest'),
    paymentMethod: paymentMethodEnum.optional().default('cash'),
    bankAccountId: z.string().optional().nullable(),
    date: optionalIsoDateSchema.optional(),
    note: z.string().optional(),
  }).superRefine((data, ctx) => {
    const method = data.paymentMethod;
    if (['debit_card', 'bank_transfer', 'cheque', 'standing_order'].includes(method)) {
      if (!data.bankAccountId || data.bankAccountId.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Bank account is required for ${method.replace('_', ' ')} payments`,
          path: ['bankAccountId'],
        });
      }
    }
  });
  const parsed = schema.parse(request.body || {});
  response.json({ data: await recordPawnPayment(userId, request.params.id, parsed) });
});

export const undoPawnPayment: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  response.json({ data: await deletePawnPayment(userId, request.params.id, request.params.paymentId) });
});

export const payFinancePayment: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const schema = z.object({
    amount: z.coerce.number().positive().optional(),
    paymentMethod: paymentMethodEnum.optional(),
    bankAccountId: z.string().optional().nullable(),
    date: optionalIsoDateSchema.optional(),
    note: z.string().optional(),
  }).superRefine((data, ctx) => {
    const method = data.paymentMethod;
    if (method && ['debit_card', 'bank_transfer', 'cheque', 'standing_order'].includes(method)) {
      if (!data.bankAccountId || data.bankAccountId.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Bank account is required for ${method.replace('_', ' ')} payments`,
          path: ['bankAccountId'],
        });
      }
    }
  });
  const parsed = schema.parse(request.body || {});
  response.json({ data: await recordFinancePayment(userId, request.params.id, parsed) });
});

export const undoFinancePayment: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  response.json({ data: await deleteFinancePaymentPayment(userId, request.params.id, request.params.paymentId) });
});

export const transactionHistory: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const filters = {
    bankAccountId: request.query.bankAccountId as string | undefined,
    cardId: request.query.cardId as string | undefined,
    startDate: request.query.startDate as string | undefined,
    endDate: request.query.endDate as string | undefined,
    category: request.query.category as string | undefined,
    type: request.query.type as 'income' | 'expense' | 'transfer' | undefined,
    paymentMethod: request.query.paymentMethod as string | undefined,
    search: request.query.search as string | undefined,
    limit: request.query.limit ? Number(request.query.limit) : undefined,
    skip: request.query.skip ? Number(request.query.skip) : undefined,
  };
  response.json(await getTransactionHistory(userId, filters));
});

export const createTransfer: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const result = await createTransferRecord(userId, request.body);
  response.status(201).json({ data: result });
});

export const undoTransfer: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const result = await deleteTransferRecord(userId, request.params.transferGroupId);
  response.json({ data: result });
});