import type { Request, Response, NextFunction } from 'express';
import { ProfileService, profileService } from '../services/profile.service.js';
import { UnauthorizedError } from '../errors/app-error.js';

export class ProfileController {
  constructor(private readonly service: ProfileService = profileService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.athlete || !req.athlete.google_id || !req.athlete.email) {
        throw new UnauthorizedError('No autorizado para crear perfil.');
      }

      const profile = await this.service.createProfile(
        {
          google_id: req.athlete.google_id,
          email: req.athlete.email
        },
        req.body
      );

      res.status(201).json(profile);
    } catch (err) {
      next(err);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const profile = await this.service.getProfile(athleteId);
      res.status(200).json(profile);
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

      const updated = await this.service.updateProfile(athleteId, req.body);
      res.status(200).json(updated);
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

      const result = await this.service.deleteProfile(athleteId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}

export const profileController = new ProfileController();
