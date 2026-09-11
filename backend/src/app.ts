import express, { type Express } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler.middleware.js';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(errorHandler);

  return app;
}
