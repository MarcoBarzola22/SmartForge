import type { Request, Response, NextFunction } from 'express';
import {
  ProgressionService,
  progressionService
} from '../services/progression.service.js';
import { UnauthorizedError } from '../errors/app-error.js';

export class ProgressionController {
  constructor(
    private readonly progressionServ: ProgressionService = progressionService
  ) {}

  getSuggestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const assignmentId = String(req.params.id);
      const suggestion = await this.progressionServ.getProgressionSuggestion(
        assignmentId,
        athleteId
      );

      res.status(200).json(suggestion);
    } catch (err) {
      next(err);
    }
  };
}

export const progressionController = new ProgressionController();
