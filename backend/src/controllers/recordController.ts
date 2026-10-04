import mongoose from 'mongoose';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errors';
import { addGoalContribution, createRecord, deleteRecord, listRecords, recordLoanRepayment, recordPawnPayment, updateRecord } from '../services/recordService';
import { recordKinds, recordSchemas, type RecordKind } from '../validations/records';
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
  const input = recordSchemas[kind].partial().parse(request.body);
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
  const { amount, date } = z.object({ amount: z.coerce.number().positive(), date: z.string().min(1) }).parse(request.body);
  response.json({ data: await addGoalContribution(userId, request.params.id, amount, date) });
});

export const repayLoan: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const { amount } = z.object({ amount: z.coerce.number().positive() }).parse(request.body);
  response.json({ data: await recordLoanRepayment(userId, request.params.id, amount) });
});

export const payPawnInterest: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  response.json({ data: await recordPawnPayment(userId, request.params.id) });
});