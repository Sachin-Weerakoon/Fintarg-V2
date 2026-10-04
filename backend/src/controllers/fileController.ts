import type { RequestHandler } from 'express';
import { HttpError } from '../middleware/errors';
import { readFile, storeFile } from '../services/fileService';
import { asyncHandler } from '../utils/asyncHandler';

export const uploadFile: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  if (!Buffer.isBuffer(request.body)) throw new HttpError(400, 'Expected a binary file body');
  const mimeType = request.header('content-type') || 'application/octet-stream';
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(mimeType)) throw new HttpError(415, 'Unsupported file type');
  const id = await storeFile(userId, mimeType, request.body);
  response.status(201).json({ id });
});

export const downloadFile: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const file = await readFile(userId, request.params.id);
  response.setHeader('content-type', file.mimeType);
  response.setHeader('content-disposition', 'inline; filename="file"');
  response.setHeader('cache-control', 'private, no-cache');
  response.send(file.data);
});