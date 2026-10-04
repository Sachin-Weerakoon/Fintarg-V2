import type { RequestHandler } from 'express';
import { connectDatabase } from '../config/database';
import { HttpError } from './errors';

export const ensureDatabase: RequestHandler = async (_request, _response, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(new HttpError(503, 'Database temporarily unavailable'));
  }
};