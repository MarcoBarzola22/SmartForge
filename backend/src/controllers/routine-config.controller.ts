import type { Request, Response, NextFunction } from 'express';
import {
  RoutineEngineV2Service,
  routineEngineV2Service
} from '../services/routine-engine-v2.service.js';

export class RoutineConfigController {
  constructor(
    private readonly service: RoutineEngineV2Service = routineEngineV2Service
  ) {}

  getTimeBlocks = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const blocks = this.service.getTimeBlockConfig();
      res.status(200).json({
        available_blocks: blocks,
        availableBlocks: blocks
      });
    } catch (err) {
      next(err);
    }
  };
}

export const routineConfigController = new RoutineConfigController();
