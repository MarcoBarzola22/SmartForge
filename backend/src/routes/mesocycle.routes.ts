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

mesocycleRoutes.post(
  '/active/cancel',
  authenticate,
  mesocycleController.cancelActive
);

mesocycleRoutes.get(
  '/active/availability-warning',
  authenticate,
  mesocycleController.getAvailabilityWarning
);

mesocycleRoutes.post(
  '/check-availability',
  authenticate,
  mesocycleController.getAvailabilityWarning
);

mesocycleRoutes.put(
  '/active/availability',
  authenticate,
  mesocycleController.updateAvailability
);

mesocycleRoutes.get(
  '/history',
  authenticate,
  mesocycleController.getHistory
);

mesocycleRoutes.get(
  '/:id',
  authenticate,
  mesocycleController.getById
);
