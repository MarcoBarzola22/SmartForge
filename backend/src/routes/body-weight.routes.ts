import { Router } from 'express';
import { z } from 'zod';
import { bodyWeightController } from '../controllers/body-weight.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody, validateParams } from '../middleware/validate.middleware.js';

export const CreateWeightLogBodySchema = z.union([
  z.object({
    weight_kg: z.number().min(30.0, 'El peso mínimo es 30.0 kg.').max(300.0, 'El peso máximo es 300.0 kg.'),
    logged_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida. Formato esperado: AAAA-MM-DD.')
  }),
  z.object({
    weightKg: z.number().min(30.0, 'El peso mínimo es 30.0 kg.').max(300.0, 'El peso máximo es 300.0 kg.'),
    loggedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida. Formato esperado: AAAA-MM-DD.')
  }).transform((v) => ({
    weight_kg: v.weightKg,
    logged_date: v.loggedDate
  }))
]);

export const UpdateWeightLogBodySchema = z.union([
  z.object({
    weight_kg: z.number().min(30.0, 'El peso mínimo es 30.0 kg.').max(300.0, 'El peso máximo es 300.0 kg.').optional(),
    logged_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida. Formato esperado: AAAA-MM-DD.').optional()
  }),
  z.object({
    weightKg: z.number().min(30.0, 'El peso mínimo es 30.0 kg.').max(300.0, 'El peso máximo es 300.0 kg.').optional(),
    loggedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida. Formato esperado: AAAA-MM-DD.').optional()
  }).transform((v) => ({
    weight_kg: v.weightKg,
    logged_date: v.loggedDate
  }))
]);

export const WeightLogParamsSchema = z.object({
  id: z.string().uuid('El ID debe ser un UUID válido.')
});

export const bodyWeightRoutes: Router = Router();

bodyWeightRoutes.get(
  '/',
  authenticate,
  bodyWeightController.getHistory
);

bodyWeightRoutes.post(
  '/',
  authenticate,
  validateBody(CreateWeightLogBodySchema),
  bodyWeightController.create
);

bodyWeightRoutes.post(
  '/batch',
  authenticate,
  bodyWeightController.createBatch
);

bodyWeightRoutes.put(
  '/:id',
  authenticate,
  validateParams(WeightLogParamsSchema),
  validateBody(UpdateWeightLogBodySchema),
  bodyWeightController.update
);

bodyWeightRoutes.delete(
  '/:id',
  authenticate,
  validateParams(WeightLogParamsSchema),
  bodyWeightController.delete
);
