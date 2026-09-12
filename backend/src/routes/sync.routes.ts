import { Router } from 'express';
import { syncController } from '../controllers/sync.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { SyncRequestSchema } from '../schemas/generated/schemas.js';

export const syncRoutes: Router = Router();

syncRoutes.post(
  '/',
  authenticate,
  validateBody(SyncRequestSchema),
  syncController.sync
);
