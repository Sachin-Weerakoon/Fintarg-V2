import { Router } from 'express';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';

export const healthRoutes = Router();

healthRoutes.get('/', async (_request, response) => {
  try {
    await connectDatabase();
  } catch {
    // Database connection failure will be reflected in readyState check
  }
  const connected = mongoose.connection.readyState === 1;
  response.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    database: connected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});