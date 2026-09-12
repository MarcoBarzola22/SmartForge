import type { Request, Response, NextFunction } from 'express';
import { AuthService, authService } from '../services/auth.service.js';
import { UnauthorizedError } from '../errors/app-error.js';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  googleAuth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const url = this.service.getGoogleAuthUrl();
      res.redirect(url);
    } catch (err) {
      next(err);
    }
  };

  googleAuthCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const codeOrToken =
        (req.query.code as string) ||
        (req.query.id_token as string) ||
        (req.body && (req.body.id_token as string));

      if (!codeOrToken) {
        throw new UnauthorizedError('Código o token de autorización ausente.');
      }

      const authResponse = await this.service.handleGoogleAuth(codeOrToken);
      res.status(200).json(authResponse);
    } catch (err) {
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const athlete = await this.service.getCurrentUser(athleteId);
      res.status(200).json(athlete);
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
