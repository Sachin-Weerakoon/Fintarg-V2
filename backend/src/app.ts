import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import pinoHttp from 'pino-http';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';
import { ensureDatabase } from './middleware/ensureDatabase';
import { errorHandler } from './middleware/errors';
import { requireAuth } from './middleware/auth';
import { authRoutes } from './routes/authRoutes';
import { cronRoutes } from './routes/cronRoutes';
import { fileRoutes } from './routes/fileRoutes';
import { healthRoutes } from './routes/healthRoutes';
import { profileRoutes } from './routes/profileRoutes';
import { recordRoutes } from './routes/recordRoutes';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin === env.FRONTEND_ORIGIN || origin === env.APP_ORIGIN || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

app.get('/', async (_request, response) => {
  try {
    await connectDatabase();
  } catch {
    // Non-blocking status check
  }
  const isDbConnected = mongoose.connection.readyState === 1;
  response.json({
    name: 'Fintarg Backend API',
    status: 'online',
    version: '1.0.0',
    database: isDbConnected ? 'connected' : 'disconnected',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      profile: '/api/profile',
      records: '/api/records',
      files: '/api/files',
      cron: '/api/cron',
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api', (_request, response) => {
  response.json({
    name: 'Fintarg Backend API',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      profile: '/api/profile',
      records: '/api/records',
      files: '/api/files',
      cron: '/api/cron',
    },
  });
});

app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/register', ensureDatabase);
app.use('/api/auth/login', ensureDatabase);
app.use('/api/auth/forgot-password', ensureDatabase);
app.use('/api/auth/reset-password', ensureDatabase);
app.use('/api/auth/me', requireAuth, ensureDatabase);
app.use('/api/profile', ensureDatabase);
app.use('/api/records', ensureDatabase);
app.use('/api/files', ensureDatabase);
app.use('/api/cron', ensureDatabase);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/cron', cronRoutes);
app.use((_request, response) => response.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);
export default app;