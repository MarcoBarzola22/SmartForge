import { Router } from 'express';
import { exerciseController } from '../controllers/exercise.controller.js';
import { routineController } from '../controllers/routine.controller.js';
import { optionalAuthenticate } from '../middleware/auth.middleware.js';

export const exerciseRoutes: Router = Router();

exerciseRoutes.get('/', exerciseController.list);
exerciseRoutes.get('/:id', exerciseController.getById);
exerciseRoutes.get('/:id/alternatives', optionalAuthenticate, routineController.getAlternatives);


