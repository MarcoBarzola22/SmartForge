import type { Request, Response, NextFunction } from 'express';
import {
  ExerciseCatalogService,
  exerciseCatalogService,
  type ListExercisesDto
} from '../services/exercise-catalog.service.js';
import type { MovementPattern, MuscleGroup } from '../schemas/generated/schemas.js';

export class ExerciseController {
  constructor(private readonly service: ExerciseCatalogService = exerciseCatalogService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters: ListExercisesDto = {
        pattern: req.query.pattern as MovementPattern | undefined,
        primary_muscle: req.query.primary_muscle as MuscleGroup | undefined,
        equipment_id: req.query.equipment_id as string | undefined,
        search: req.query.search as string | undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
        offset: req.query.offset ? parseInt(String(req.query.offset), 10) : undefined
      };

      const exercises = await this.service.listExercises(filters);
      res.status(200).json(exercises);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const exercise = await this.service.getExerciseById(id as string);
      res.status(200).json(exercise);
    } catch (err) {
      next(err);
    }
  };

  getAlternatives = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const equipmentId = req.query.equipment_id as string | undefined;
      const alternatives = await this.service.getAlternatives(id as string, equipmentId);
      res.status(200).json(alternatives);
    } catch (err) {
      next(err);
    }
  };
}

export const exerciseController = new ExerciseController();
