import { Router } from 'express';
import mongoose from 'mongoose';

export const healthRoutes = Router();

healthRoutes.get('/', (_request, response) => {
  const connected = mongoose.connection.readyState === 1;
  response.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'degraded', database: connected ? 'connected' : 'disconnected' });
});