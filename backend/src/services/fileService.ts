import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { FileModel } from '../models/File';
import { HttpError } from '../middleware/errors';

function getEncryptionKey(): Buffer {
  const raw = env.FILE_ENCRYPTION_KEY;
  try {
    const fromBase64 = Buffer.from(raw, 'base64');
    if (fromBase64.length === 32) {
      return fromBase64;
    }
  } catch {
    // fallback to hash
  }
  return createHash('sha256').update(raw).digest();
}

export async function storeFile(userId: string, mimeType: string, input: Buffer) {
  if (input.length < 1 || input.length > 10 * 1024 * 1024) throw new HttpError(400, 'File must be between 1 byte and 10 MB');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const data = Buffer.concat([cipher.update(input), cipher.final()]);
  const file = await FileModel.create({ userId: new mongoose.Types.ObjectId(userId), mimeType, sizeBytes: input.length, data, iv, tag: cipher.getAuthTag() });
  return file.id;
}

export async function readFile(userId: string, fileId: string) {
  if (!mongoose.isValidObjectId(fileId)) throw new HttpError(400, 'Invalid file id');
  const file = await FileModel.findOne({ _id: fileId, userId });
  if (!file) throw new HttpError(404, 'File not found');
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), file.iv);
  decipher.setAuthTag(file.tag);
  return { mimeType: file.mimeType, data: Buffer.concat([decipher.update(file.data), decipher.final()]) };
}