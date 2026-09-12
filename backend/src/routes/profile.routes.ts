import { Router } from 'express';
import { profileController } from '../controllers/profile.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  CreateProfileRequestSchema,
  UpdateProfileRequestSchema
} from '../schemas/generated/schemas.js';

export const profileRoutes: Router = Router();

profileRoutes.post(
  '/',
  authenticate,
  validateBody(CreateProfileRequestSchema),
  profileController.create
);

profileRoutes.get(
  '/',
  authenticate,
  profileController.get
);

profileRoutes.put(
  '/',
  authenticate,
  validateBody(UpdateProfileRequestSchema),
  profileController.update
);

profileRoutes.delete(
  '/',
  authenticate,
  profileController.delete
);
