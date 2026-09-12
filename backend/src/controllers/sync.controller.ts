import type { Request, Response, NextFunction } from 'express';
import { SyncService, syncService } from '../services/sync.service.js';
import { UnauthorizedError } from '../errors/app-error.js';

export class SyncController {
  constructor(private readonly service: SyncService = syncService) {}

  sync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado para sincronizar datos.');
      }

      const result = await this.service.syncBatch(athleteId, req.body);
      res.status(result.status).json(result.body);
    } catch (err) {
      next(err);
    }
  };
}

export const syncController = new SyncController();
