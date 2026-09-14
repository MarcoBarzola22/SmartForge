import { Router } from 'express';
import { routineConfigController } from '../controllers/routine-config.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const routineConfigRoutes: Router = Router();

routineConfigRoutes.get(
  '/config/time-blocks',
  authenticate,
  routineConfigController.getTimeBlocks
);
