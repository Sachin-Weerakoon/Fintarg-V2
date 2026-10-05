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

  if (_request.accepts('html')) {
    return response.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fintarg API Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0b0f19; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: rgba(17, 24, 39, 0.95); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 36px; max-width: 540px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); }
    .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; border: 1px solid rgba(16, 185, 129, 0.3); margin-bottom: 20px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #34d399; box-shadow: 0 0 10px #34d399; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.9); } }
    h1 { font-size: 26px; font-weight: 700; margin-bottom: 8px; color: #fff; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .stat-box { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 14px 16px; }
    .stat-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; }
    .stat-value { font-size: 15px; font-weight: 600; color: #e2e8f0; margin-top: 4px; display: flex; align-items: center; gap: 6px; }
    .endpoints { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 16px; margin-bottom: 24px; }
    .endpoints-title { font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .endpoint-item { display: flex; justify-content: space-between; font-size: 13px; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); color: #cbd5e1; }
    .endpoint-item:last-child { border-bottom: none; }
    .endpoint-item code { color: #38bdf8; font-family: monospace; font-size: 12px; background: rgba(56, 189, 248, 0.1); padding: 2px 8px; border-radius: 6px; }
    .notice { font-size: 13px; color: #94a3b8; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; line-height: 1.5; }
    .notice strong { color: #f8fafc; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <span class="dot"></span>
      Backend API Online & Running
    </div>
    <h1>Fintarg API Server</h1>
    <p>The backend REST API service is active, operational, and connected to MongoDB Atlas.</p>
    
    <div class="stats">
      <div class="stat-box">
        <div class="stat-label">API Status</div>
        <div class="stat-value" style="color: #34d399;">Active & Online</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Database</div>
        <div class="stat-value" style="color: ${isDbConnected ? '#34d399' : '#f59e0b'};">
          ${isDbConnected ? 'Connected (Atlas)' : 'Connecting...'}
        </div>
      </div>
    </div>

    <div class="endpoints">
      <div class="endpoints-title">Available API Endpoints</div>
      <div class="endpoint-item"><span>Health Check</span><code>/api/health</code></div>
      <div class="endpoint-item"><span>Authentication</span><code>/api/auth</code></div>
      <div class="endpoint-item"><span>User Profile</span><code>/api/profile</code></div>
      <div class="endpoint-item"><span>Finance Records</span><code>/api/records</code></div>
      <div class="endpoint-item"><span>File Vault</span><code>/api/files</code></div>
      <div class="endpoint-item"><span>Scheduled Tasks</span><code>/api/cron</code></div>
    </div>

    <div class="notice">
      ℹ️ This is the <strong>Backend API</strong>. To access the user interface and dashboard, deploy the <strong>frontend</strong> service.
    </div>
  </div>
</body>
</html>`);
  }

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