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
import { NotFoundError } from '../errors/app-error.js';

export type GoogleTokenVerifier = (
  idToken: string,
  clientId?: string
) => Promise<{ googleId: string; email: string; name: string }>;

export class AuthService {
  constructor(
    private readonly athleteRepo: AthleteRepository = athleteRepository,
    private readonly verifyGoogleToken: GoogleTokenVerifier = verifyGoogleIdToken
  ) {}

  /**
   * Procesa el login / registro mediante Google OAuth ID token.
   * Si el atleta ya existe en la base de datos, retorna is_profile_complete: true y el perfil.
   * Si no existe, retorna is_profile_complete: false y un token con payload temporal para completar el onboarding.
   */
  async handleGoogleAuth(idToken: string): Promise<AuthResponse> {
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
  async getCurrentUser(athleteId: string): Promise<AthleteProfile> {
    const athlete = await this.athleteRepo.findById(athleteId);
    if (!athlete) {
      throw new NotFoundError('Atleta no encontrado o inactivo.');
    }
    return athlete;
  }

  /**
   * Genera la URL de autorización de Google OAuth 2.0 para el endpoint /api/auth/google.
   */
  getGoogleAuthUrl(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID || 'smartforge-google-client-id';
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
    const scope = encodeURIComponent('openid email profile');

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  }
}

export const authService = new AuthService();
