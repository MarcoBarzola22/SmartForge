import { Router } from 'express';
import { sessionController } from '../controllers/session.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { UpdateSetLogRequestSchema } from '../schemas/generated/schemas.js';

export const setRoutes: Router = Router();

setRoutes.put(
  '/:id',
  authenticate,
  validateBody(UpdateSetLogRequestSchema),
  sessionController.updateSet
);

setRoutes.delete(
  '/:id',
  authenticate,
  sessionController.deleteSet
);
