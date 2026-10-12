import type { RequestHandler } from 'express';
import { HttpError } from '../middleware/errors';
import { readFile, storeFile } from '../services/fileService';
import { asyncHandler } from '../utils/asyncHandler';

export function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf'; // %PDF
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50    // WEBP
  ) {
    return 'image/webp';
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 && buffer[1] === 0x4B &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  ) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0 &&
    buffer[4] === 0xA1 && buffer[5] === 0xB1 && buffer[6] === 0x1A && buffer[7] === 0xE1
  ) {
    return 'application/msword';
  }
  return null;
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024; // 4 MB

export const uploadFile: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  if (!Buffer.isBuffer(request.body)) throw new HttpError(400, 'Expected a binary file body');

  if (request.body.length < 4) {
    throw new HttpError(400, 'File must be at least 4 bytes');
  }

  const isAvatar = request.query.purpose === 'avatar';
  const maxAllowedBytes = isAvatar ? MAX_AVATAR_BYTES : MAX_DOCUMENT_BYTES;

  if (request.body.length > maxAllowedBytes) {
    const limitMb = maxAllowedBytes / (1024 * 1024);
    throw new HttpError(400, `File size (${(request.body.length / (1024 * 1024)).toFixed(2)} MB) exceeds the ${limitMb} MB limit`);
  }

  const detectedMimeType = detectMimeType(request.body);
  if (!detectedMimeType) {
    throw new HttpError(415, 'Invalid or unsupported file format (signature mismatch)');
  }

  if (isAvatar && !['image/jpeg', 'image/png', 'image/webp'].includes(detectedMimeType)) {
    throw new HttpError(400, 'Avatar must be a valid image file (JPEG, PNG, or WEBP)');
  }

  const id = await storeFile(userId, detectedMimeType, request.body, maxAllowedBytes);
  response.status(201).json({ id, mimeType: detectedMimeType });
});

export const downloadFile: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;
  if (!userId) throw new HttpError(401, 'Authentication required');
  const file = await readFile(userId, request.params.id);

  response.setHeader('x-content-type-options', 'nosniff');
  response.setHeader('content-type', file.mimeType);

  const isInline = file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf';
  const disposition = isInline ? 'inline; filename="file"' : 'attachment; filename="document"';
  response.setHeader('content-disposition', disposition);
  response.setHeader('cache-control', 'private, no-cache');
  response.send(file.data);
});