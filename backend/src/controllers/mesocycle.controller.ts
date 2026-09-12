import type { Request, Response, NextFunction } from 'express';
import {
  MesocycleGeneratorService,
  mesocycleGeneratorService
} from '../services/mesocycle-generator.service.js';
import {
  MesocycleRotationService,
  mesocycleRotationService
} from '../services/mesocycle-rotation.service.js';
import { UnauthorizedError } from '../errors/app-error.js';

export class MesocycleController {
  constructor(
    private readonly service: MesocycleGeneratorService = mesocycleGeneratorService,
    private readonly rotationService: MesocycleRotationService = mesocycleRotationService
  ) {}

  generate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado para generar un mesociclo.');
      }

      const mesocycle = await this.rotationService.rotateAndPersistForAthlete(
        athleteId,
        req.body
      );

      res.status(201).json(mesocycle);
    } catch (err) {
      next(err);
    }
  };

  getCurrent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const mesocycle = await this.service.getCurrentMesocycle(athleteId);
      res.status(200).json(mesocycle);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const mesocycle = await this.service.getMesocycleById(athleteId, String(req.params.id));
      res.status(200).json(mesocycle);
    } catch (err) {
      next(err);
    }
  };
}

export const mesocycleController = new MesocycleController();
