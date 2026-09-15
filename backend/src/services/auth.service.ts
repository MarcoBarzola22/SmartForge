import {
  AthleteRepository,
  athleteRepository
} from '../repositories/athlete.repository.js';
import type {
  AthleteProfile,
  AuthResponse
} from '../schemas/generated/schemas.js';
import {
  verifyGoogleIdToken,
  signToken
} from '../middleware/auth.middleware.js';
import { NotFoundError, UnauthorizedError } from '../errors/app-error.js';

export type GoogleTokenVerifier = (
  idToken: string,
  clientId?: string
) => Promise<{ googleId: string; email: string; name: string }>;

/**
 * Intercambia un authorization code de Google por un id_token usando el token endpoint.
 */
async function exchangeCodeForIdToken(code: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/auth/google/callback';

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Google token exchange failed:', errorBody);
    throw new UnauthorizedError('No se pudo intercambiar el código de autorización con Google.');
  }

  const data = (await response.json()) as { id_token?: string; access_token?: string };

  if (!data.id_token) {
    throw new UnauthorizedError('Google no retornó un id_token válido.');
  }

  return data.id_token;
}

export type GoogleCodeExchanger = (code: string) => Promise<string>;

export class AuthService {
  constructor(
    private readonly athleteRepo: AthleteRepository = athleteRepository,
    private readonly verifyGoogleToken: GoogleTokenVerifier = verifyGoogleIdToken,
    private readonly exchangeCode: GoogleCodeExchanger = exchangeCodeForIdToken
  ) {}

  /**
   * Procesa el login / registro mediante Google OAuth.
   * Acepta un authorization code (empieza con "4/") o un id_token directo.
   * Si el atleta ya existe en la base de datos, retorna is_profile_complete: true y el perfil.
   * Si no existe, retorna is_profile_complete: false y un token con payload temporal para completar el onboarding.
   */
  async handleGoogleAuth(codeOrToken: string): Promise<AuthResponse> {
    // Detectar si es un authorization code o un id_token
    let idToken: string;
    if (codeOrToken.startsWith('4/') || codeOrToken.length < 200) {
      // Authorization code → intercambiar por id_token
      idToken = await this.exchangeCode(codeOrToken);
    } else {
      // Ya es un id_token (JWT largo)
      idToken = codeOrToken;
    }

    const googlePayload = await this.verifyGoogleToken(idToken);

    // Buscar atleta por Google ID o Email
    let athlete = await this.athleteRepo.findByGoogleId(googlePayload.googleId);
    if (!athlete) {
      athlete = await this.athleteRepo.findByEmail(googlePayload.email);
    }

    if (athlete) {
      const token = signToken({
        id: athlete.id,
        email: athlete.email,
        google_id: athlete.google_id,
        name: athlete.name
      });

      return {
        token,
        is_profile_complete: true,
        profile: athlete
      };
    }

    // Nuevo usuario: emitir JWT para permitir completar el onboarding
    const token = signToken({
      email: googlePayload.email,
      google_id: googlePayload.googleId,
      name: googlePayload.name
    });

    return {
      token,
      is_profile_complete: false
    };
  }

  /**
   * Obtiene los datos del atleta autenticado para el endpoint /api/auth/me.
   */
  async getCurrentUser(
    athleteRef: string | { id?: string; google_id?: string; email?: string }
  ): Promise<AthleteProfile> {
    let athlete: AthleteProfile | null = null;

    if (typeof athleteRef === 'string') {
      if (athleteRef) athlete = await this.athleteRepo.findById(athleteRef);
    } else {
      if (athleteRef.id) {
        athlete = await this.athleteRepo.findById(athleteRef.id);
      }
      if (!athlete && athleteRef.google_id) {
        athlete = await this.athleteRepo.findByGoogleId(athleteRef.google_id);
      }
      if (!athlete && athleteRef.email) {
        athlete = await this.athleteRepo.findByEmail(athleteRef.email);
      }
    }

    if (!athlete) {
      throw new NotFoundError('Perfil de atleta no encontrado o inactivo.');
    }
    return athlete;
  }

  /**
   * Genera la URL de autorización de Google OAuth 2.0 para el endpoint /api/auth/google.
   */
  getGoogleAuthUrl(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/auth/google/callback';
    const scope = encodeURIComponent('openid email profile');

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  }
}

export const authService = new AuthService();

