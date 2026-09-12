import { Router } from 'express';
import { routineController } from '../controllers/routine.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { SwapExerciseRequestSchema } from '../schemas/generated/schemas.js';

export const routineRoutes: Router = Router();

routineRoutes.post(
  '/:id/swap',
  authenticate,
  validateBody(SwapExerciseRequestSchema),
  routineController.swap
);
