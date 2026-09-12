import {
  AthleteRepository,
  athleteRepository
} from '../repositories/athlete.repository.js';
import type {
  AthleteProfile,
  CreateProfileRequest,
  UpdateProfileRequest
} from '../schemas/generated/schemas.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/app-error.js';

export interface AthleteAuthIdentity {
  google_id: string;
  email: string;
}

export class ProfileService {
  constructor(private readonly athleteRepo: AthleteRepository = athleteRepository) {}

  /**
   * Crea el perfil inicial de un atleta tras la primera autenticación con Google (onboarding).
   * Valida edad mínima (≥16 años) y rechaza emails o identidades duplicadas (CA-01.2, CA-01.3).
   */
  async createProfile(
    auth: AthleteAuthIdentity,
    data: CreateProfileRequest
  ): Promise<AthleteProfile> {
    if (data.age < 16) {
      throw new BadRequestError('El atleta debe tener al menos 16 años para registrarse.');
    }

    const existingByGoogle = await this.athleteRepo.findByGoogleId(auth.google_id);
    if (existingByGoogle) {
      throw new ConflictError('Ya existe un perfil asociado a esta cuenta de Google.');
    }

    const existingByEmail = await this.athleteRepo.findByEmail(auth.email);
    if (existingByEmail) {
      throw new ConflictError('Ya existe un perfil asociado a este email de Google.');
    }

    return this.athleteRepo.create(
      {
        google_id: auth.google_id,
        email: auth.email,
        name: data.name,
        age: data.age,
        weight_kg: data.weight_kg,
        experience_level: data.experience_level,
        training_goal: data.training_goal,
        available_days_per_week: data.available_days_per_week
      },
      data.equipment_ids
    );
  }

  /**
   * Obtiene el perfil del atleta por ID.
   */
  async getProfile(athleteId: string): Promise<AthleteProfile> {
    const athlete = await this.athleteRepo.findById(athleteId);
    if (!athlete) {
      throw new NotFoundError('Perfil de atleta no encontrado o inactivo.');
    }
    return athlete;
  }

  /**
   * Actualiza el perfil de un atleta autenticado y sincroniza su equipamiento disponible.
   */
  async updateProfile(
    athleteId: string,
    data: UpdateProfileRequest
  ): Promise<AthleteProfile> {
    const existing = await this.athleteRepo.findById(athleteId);
    if (!existing) {
      throw new NotFoundError('Perfil de atleta no encontrado.');
    }

    const updated = await this.athleteRepo.update(
      athleteId,
      {
        name: data.name,
        weight_kg: data.weight_kg,
        experience_level: data.experience_level,
        training_goal: data.training_goal,
        available_days_per_week: data.available_days_per_week
      },
      data.equipment_ids
    );

    if (!updated) {
      throw new NotFoundError('Perfil de atleta no encontrado.');
    }

    return updated;
  }

  /**
   * Realiza un soft-delete de la cuenta del atleta (deleted_at).
   */
  async deleteProfile(athleteId: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.athleteRepo.findById(athleteId);
    if (!existing) {
      throw new NotFoundError('Perfil de atleta no encontrado.');
    }

    await this.athleteRepo.softDelete(athleteId);

    return {
      success: true,
      message: 'Cuenta eliminada exitosamente.'
    };
  }
}

export const profileService = new ProfileService();
