import { Router } from 'express';
import { mesocycleController } from '../controllers/mesocycle.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { GenerateMesocycleRequestSchema } from '../schemas/generated/schemas.js';

export const mesocycleRoutes: Router = Router();

mesocycleRoutes.post(
  '/',
  authenticate,
  validateBody(GenerateMesocycleRequestSchema),
  mesocycleController.generate
);

mesocycleRoutes.get(
  '/current',
  authenticate,
  mesocycleController.getCurrent
);

mesocycleRoutes.get(
  '/:id',
  authenticate,
  mesocycleController.getById
);
