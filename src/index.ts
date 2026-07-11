import { createApp } from './app.js';
import { config, logger, connectDatabase } from './config/index.js';
import { documentStorageService } from './services/DocumentStorageService.js';

async function bootstrap() {
  await connectDatabase();
  await documentStorageService.ensureUploadDir();

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    logger.info(`Quantum AI listening on port ${config.PORT}`, {
      env: config.NODE_ENV,
      prefix: config.API_PREFIX,
      authRequired: config.AUTH_REQUIRED,
    });
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start Quantum AI', { err });
  process.exit(1);
});
