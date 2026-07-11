import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { globalRateLimiter, errorHandler, notFoundHandler } from './middleware/index.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(globalRateLimiter);

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        name: 'Quantum AI Assistant API',
        version: '1.0.0',
        docs: '/api/v1/health',
        prefix: config.API_PREFIX,
      },
    });
  });

  app.use(config.API_PREFIX, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
