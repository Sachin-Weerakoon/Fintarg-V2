import crypto from 'crypto';
import { getEnv } from './env';
import { FileModel } from '@/models/File';

const KEY = () => Buffer.from(getEnv().FILE_ENCRYPTION_KEY, 'base64');

export function encryptBuffer(data: Buffer): { iv: Buffer; tag: Buffer; ciphertext: Buffer } {
  const iv = crypto.randomBytes(12);
  const key = KEY();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv, tag, ciphertext };
}

export function decryptBuffer(iv: Buffer, tag: Buffer, ciphertext: Buffer): Buffer {
  const key = KEY();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export async function storeEncryptedFile(userId: string, mimeType: string, data: Buffer): Promise<string> {
  const { iv, tag, ciphertext } = encryptBuffer(data);
  const doc = await FileModel.create({
    userId: new (await import('mongoose')).default.Types.ObjectId(userId),
    mimeType,
    sizeBytes: data.length,
    data: ciphertext,
    iv,
    tag,
  });
  return doc._id.toString();
}

export async function getEncryptedFile(userId: string, fileId: string): Promise<{ mimeType: string; data: Buffer } | null> {
  const doc = await FileModel.findOne({ _id: fileId, userId: new (await import('mongoose')).default.Types.ObjectId(userId) });
  if (!doc) return null;
  const data = decryptBuffer(doc.iv, doc.tag, doc.data);
  return { mimeType: doc.mimeType, data };
}

export async function deleteEncryptedFile(userId: string, fileId: string): Promise<boolean> {
  const result = await FileModel.deleteOne({ _id: fileId, userId: new (await import('mongoose')).default.Types.ObjectId(userId) });
  return result.deletedCount === 1;
}
