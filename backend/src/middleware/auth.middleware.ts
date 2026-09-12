import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { UnauthorizedError } from '../errors/app-error.js';

export interface AuthenticatedAthlete {
  id: string;
  email: string;
  google_id: string;
  name?: string;
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      athlete?: AuthenticatedAthlete;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

const getJwtSecret = (): string => {
  return process.env.JWT_SECRET || 'smartforge-default-dev-jwt-secret-at-least-32-chars';
};

/**
 * Genera un token JWT firmado para el atleta autenticado.
 */
export function signToken(
  payload: { id?: string; email: string; google_id: string; name?: string },
  expiresIn = '7d'
): string {
  const secret = getJwtSecret();
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      google_id: payload.google_id,
      name: payload.name
    },
    secret,
    { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
  );
}

/**
 * Verifica un id_token emitido por Google OAuth 2.0.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  clientId?: string
): Promise<{ googleId: string; email: string; name: string }> {
  const targetClientId = clientId || process.env.GOOGLE_CLIENT_ID;
  const client = new OAuth2Client(targetClientId);

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: targetClientId
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new UnauthorizedError('Token de Google inválido o incompleto.');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0] || 'Atleta'
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('No se pudo verificar el token de Google.');
  }
}

import { athleteRepository } from '../repositories/athlete.repository.js';

/**
 * Middleware Express para proteger rutas que requieren autenticación Bearer JWT.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No autorizado. Token de autorización ausente o inválido.');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedError('No autorizado. Token vacío.');
    }

    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

    if (!decoded || !decoded.email || !decoded.google_id) {
      throw new UnauthorizedError('Token JWT inválido: campos requeridos ausentes.');
    }

    let athleteId = String(decoded.id || decoded.sub || '');
    if (!athleteId) {
      const athlete =
        (await athleteRepository.findByGoogleId(decoded.google_id)) ||
        (await athleteRepository.findByEmail(decoded.email));
      if (athlete) {
        athleteId = athlete.id;
      }
    }

    req.athlete = {
      id: athleteId,
      email: String(decoded.email),
      google_id: String(decoded.google_id),
      name: decoded.name ? String(decoded.name) : undefined
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('No autorizado. Token expirado.'));
      return;
    }
    if (err instanceof UnauthorizedError) {
      next(err);
      return;
    }
    next(new UnauthorizedError('No autorizado. Token inválido o corrupto.'));
  }
}

/**
 * Middleware Express para autenticación opcional Bearer JWT.
 * Si el token está presente, lo valida y asigna req.athlete.
 * Si no está presente, continúa sin error.
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return next();
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

    if (decoded && decoded.email && decoded.google_id) {
      let athleteId = String(decoded.id || decoded.sub || '');
      if (!athleteId) {
        const athlete =
          (await athleteRepository.findByGoogleId(decoded.google_id)) ||
          (await athleteRepository.findByEmail(decoded.email));
        if (athlete) {
          athleteId = athlete.id;
        }
      }

      req.athlete = {
        id: athleteId,
        email: String(decoded.email),
        google_id: String(decoded.google_id),
        name: decoded.name ? String(decoded.name) : undefined
      };
    }
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('No autorizado. Token expirado.'));
      return;
    }
    next(new UnauthorizedError('No autorizado. Token inválido o corrupto.'));
  }
}

