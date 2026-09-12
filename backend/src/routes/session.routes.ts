import { Router } from 'express';
import { z } from 'zod';
import { sessionController } from '../controllers/session.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  CheckInRequestSchema,
  CreateSetLogRequestSchema,
  CreatePainReportRequestSchema
} from '../schemas/generated/schemas.js';

export const CreateSessionRequestSchema = z.object({
  session_plan_id: z.string().uuid({ message: 'El identificador de sesión debe ser un UUID válido.' })
});

export const sessionRoutes: Router = Router();

sessionRoutes.post(
  '/',
  authenticate,
  validateBody(CreateSessionRequestSchema),
  sessionController.createSession
);

sessionRoutes.post(
  '/:id/checkin',
  authenticate,
  validateBody(CheckInRequestSchema),
  sessionController.submitCheckin
);

sessionRoutes.post(
  '/:id/sets',
  authenticate,
  validateBody(CreateSetLogRequestSchema),
  sessionController.logSet
);

sessionRoutes.post(
  '/:id/pain-reports',
  authenticate,
  validateBody(CreatePainReportRequestSchema),
  sessionController.reportPain
);

sessionRoutes.patch(
  '/:id/complete',
  authenticate,
  sessionController.completeSession
);
