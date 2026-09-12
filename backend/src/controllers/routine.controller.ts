import type { Request, Response, NextFunction } from 'express';
import {
  RoutineEditorService,
  routineEditorService
} from '../services/routine-editor.service.js';
import { UnauthorizedError } from '../errors/app-error.js';

export class RoutineController {
  constructor(
    private readonly service: RoutineEditorService = routineEditorService
  ) {}

  getAlternatives = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const exerciseId = String(req.params.id);
      const equipmentQuery = req.query.equipment_id;

      if (equipmentQuery) {
        const equipmentIds = Array.isArray(equipmentQuery)
          ? (equipmentQuery as string[])
          : [String(equipmentQuery)];
        const result = await this.service.getAlternativesByEquipment(exerciseId, equipmentIds);
        res.status(200).json(result.alternatives);
        return;
      }

      const athleteId = req.athlete?.id;
      if (!athleteId) {
        const result = await this.service.getAlternativesByEquipment(exerciseId, []);
        res.status(200).json(result.alternatives);
        return;
      }

      const result = await this.service.getAlternativesForAthlete(athleteId, exerciseId);
      res.status(200).json(result.alternatives);
    } catch (err) {
      next(err);
    }
  };

  swap = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const assignmentId = String(req.params.id);
      const updatedAssignment = await this.service.swapExercise(
        assignmentId,
        req.body,
        athleteId
      );

      res.status(200).json(updatedAssignment);
    } catch (err) {
      next(err);
    }
  };
}

export const routineController = new RoutineController();
