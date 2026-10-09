import type { RequestHandler } from 'express';
import { HttpError } from '../middleware/errors';
import { readFile, storeFile } from '../services/fileService';
import { asyncHandler } from '../utils/asyncHandler';

export const uploadFile: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  if (!Buffer.isBuffer(request.body)) throw new HttpError(400, 'Expected a binary file body');
  
  const rawContentType = request.header('content-type') || 'application/octet-stream';
  let mimeType = rawContentType.split(';')[0].trim().toLowerCase();

  // Sniff magic bytes if browser sent octet-stream
  if (mimeType === 'application/octet-stream' && request.body.length >= 4) {
    if (request.body[0] === 0x25 && request.body[1] === 0x50 && request.body[2] === 0x44 && request.body[3] === 0x46) {
      mimeType = 'application/pdf'; // %PDF
    } else if (request.body[0] === 0x89 && request.body[1] === 0x50 && request.body[2] === 0x4E && request.body[3] === 0x47) {
      mimeType = 'image/png';
    } else if (request.body[0] === 0xFF && request.body[1] === 0xD8) {
      mimeType = 'image/jpeg';
    }
  }

  const allowedTypes = [
    'application/pdf',
    'application/x-pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];
  if (!allowedTypes.includes(mimeType)) throw new HttpError(415, `Unsupported file type: ${mimeType}`);
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