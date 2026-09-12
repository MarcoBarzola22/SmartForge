import { Router } from 'express';
import { progressionController } from '../controllers/progression.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const progressionRoutes: Router = Router();

progressionRoutes.get(
  '/:id/progression',
  authenticate,
  progressionController.getSuggestion
);
