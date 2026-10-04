import { app } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Fintarg API listening');
});

void connectDatabase().catch(error => logger.error({ err: error }, 'Initial MongoDB connection failed; API will retry on requests'));

function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down API');
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));