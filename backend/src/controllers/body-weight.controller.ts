import type { Request, Response, NextFunction } from 'express';
import { BodyWeightService, bodyWeightService } from '../services/body-weight.service.js';
import { UnauthorizedError } from '../errors/app-error.js';

export class BodyWeightController {
  constructor(private readonly service: BodyWeightService = bodyWeightService) {}

  getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const logs = await this.service.getHistory(athleteId);
      res.status(200).json({ logs });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const log = await this.service.createLog(athleteId, req.body);
      res.status(201).json({ log });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const logId = String(req.params.id);
      const log = await this.service.updateLog(athleteId, logId, req.body);
      res.status(200).json({ log });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const logId = String(req.params.id);
      const result = await this.service.deleteLog(athleteId, logId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  createBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const items = Array.isArray(req.body) ? req.body : req.body.logs;
      const logs = await this.service.createBatchLogs(athleteId, items);
      res.status(201).json({ logs });
    } catch (err) {
      next(err);
    }
  };
}

export const bodyWeightController = new BodyWeightController();
