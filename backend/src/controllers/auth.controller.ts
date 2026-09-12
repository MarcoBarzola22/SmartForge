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

      // Redirect back to the frontend SPA with the token as query params
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const params = new URLSearchParams({
        token: authResponse.token,
        is_profile_complete: String(authResponse.is_profile_complete)
      });
      res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
    } catch (err) {
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.athlete) {
        throw new UnauthorizedError('No autorizado.');
      }

      const athlete = await this.service.getCurrentUser({
        id: req.athlete.id,
        google_id: req.athlete.google_id,
        email: req.athlete.email
      });

      res.status(200).json(athlete);
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
