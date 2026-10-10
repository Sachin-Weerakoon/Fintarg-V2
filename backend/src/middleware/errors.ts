import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }

  get status(): number {
    return this.statusCode;
  }
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: 'Validation failed', details: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) });
    return;
  }
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error && typeof error === 'object' && ('code' in error) && (error as { code: unknown }).code === 11000) {
    const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern;
    const field = keyPattern ? Object.keys(keyPattern)[0] : 'field';
    response.status(409).json({ error: `${field === 'email' ? 'Email' : field} already registered` });
    return;
  }

  logger.error({ err: error }, 'Unhandled request error');
  response.status(500).json({ error: 'Internal server error' });
};