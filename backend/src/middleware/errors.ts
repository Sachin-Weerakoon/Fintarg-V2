import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
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

  logger.error({ err: error }, 'Unhandled request error');
  response.status(500).json({ error: 'Internal server error' });
};