import express, { type Express } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { exerciseRoutes } from './routes/exercise.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { profileRoutes } from './routes/profile.routes.js';
import { mesocycleRoutes } from './routes/mesocycle.routes.js';
import { routineRoutes } from './routes/routine.routes.js';
import { sessionRoutes } from './routes/session.routes.js';
import { setRoutes } from './routes/set.routes.js';
import { progressionRoutes } from './routes/progression.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/exercises', exerciseRoutes);
  app.use('/exercises', exerciseRoutes);

  app.use('/api/auth', authRoutes);
  app.use('/auth', authRoutes);

  app.use('/api/profile', profileRoutes);
  app.use('/profile', profileRoutes);

  app.use('/api/mesocycles', mesocycleRoutes);
  app.use('/mesocycles', mesocycleRoutes);

  app.use('/api/assignments', routineRoutes);
  app.use('/assignments', routineRoutes);

  app.use('/api/assignments', progressionRoutes);
  app.use('/assignments', progressionRoutes);

  app.use('/api/sessions', sessionRoutes);
  app.use('/sessions', sessionRoutes);

  app.use('/api/sets', setRoutes);
  app.use('/sets', setRoutes);

  app.use(errorHandler);

  return app;
}
