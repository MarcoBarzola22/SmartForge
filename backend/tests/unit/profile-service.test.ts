import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from '../../src/services/profile.service.js';
import type { AthleteRepository } from '../../src/repositories/athlete.repository.js';
import type { AthleteProfile, CreateProfileRequest, UpdateProfileRequest } from '../../src/schemas/generated/schemas.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../src/errors/app-error.js';

describe('TASK-22: ProfileService', () => {
  let mockRepo: Partial<AthleteRepository>;
  let service: ProfileService;

  const sampleAthlete: AthleteProfile = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    google_id: 'google-uid-12345',
    email: 'athlete@example.com',
    name: 'Carlos Ruiz',
    age: 25,
    weight_kg: 78.5,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    equipment: [
      { id: 'barbell', name: 'Barra Olímpica', category: 'barras_y_discos' },
      { id: 'rack', name: 'Rack de Sentadillas', category: 'soportes' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const validCreateDto: CreateProfileRequest = {
    name: 'Carlos Ruiz',
    age: 25,
    weight_kg: 78.5,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    equipment_ids: ['barbell', 'rack']
  };

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByGoogleId: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn()
    };
    service = new ProfileService(mockRepo as AthleteRepository);
  });

  describe('createProfile', () => {
    it('should create a new profile successfully when data is valid', async () => {
      vi.mocked(mockRepo.findByGoogleId!).mockResolvedValue(null);
      vi.mocked(mockRepo.findByEmail!).mockResolvedValue(null);
      vi.mocked(mockRepo.create!).mockResolvedValue(sampleAthlete);

      const result = await service.createProfile(
        { google_id: 'google-uid-12345', email: 'athlete@example.com' },
        validCreateDto
      );

      expect(result).toEqual(sampleAthlete);
      expect(mockRepo.findByGoogleId).toHaveBeenCalledWith('google-uid-12345');
      expect(mockRepo.findByEmail).toHaveBeenCalledWith('athlete@example.com');
      expect(mockRepo.create).toHaveBeenCalledWith(
        {
          google_id: 'google-uid-12345',
          email: 'athlete@example.com',
          name: 'Carlos Ruiz',
          age: 25,
          weight_kg: 78.5,
          experience_level: 'intermedio',
          training_goal: 'hipertrofia',
          available_days_per_week: 4
        },
        ['barbell', 'rack']
      );
    });

    it('should reject athlete with age < 16 years (CA-01.2, Constitution §1)', async () => {
      const invalidDto: CreateProfileRequest = {
        ...validCreateDto,
        age: 15
      };

      await expect(
        service.createProfile(
          { google_id: 'google-uid-12345', email: 'athlete@example.com' },
          invalidDto
        )
      ).rejects.toThrow(BadRequestError);

      await expect(
        service.createProfile(
          { google_id: 'google-uid-12345', email: 'athlete@example.com' },
          invalidDto
        )
      ).rejects.toThrow(/al menos 16 años/i);

      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should reject duplicate Google email with ConflictError 409 (CA-01.3)', async () => {
      vi.mocked(mockRepo.findByGoogleId!).mockResolvedValue(null);
      vi.mocked(mockRepo.findByEmail!).mockResolvedValue(sampleAthlete);

      await expect(
        service.createProfile(
          { google_id: 'google-uid-99999', email: 'athlete@example.com' },
          validCreateDto
        )
      ).rejects.toThrow(ConflictError);

      await expect(
        service.createProfile(
          { google_id: 'google-uid-99999', email: 'athlete@example.com' },
          validCreateDto
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'CONFLICT'
      });

      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should reject duplicate Google ID with ConflictError 409', async () => {
      vi.mocked(mockRepo.findByGoogleId!).mockResolvedValue(sampleAthlete);

      await expect(
        service.createProfile(
          { google_id: 'google-uid-12345', email: 'different@example.com' },
          validCreateDto
        )
      ).rejects.toThrow(ConflictError);

      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return athlete profile when found', async () => {
      vi.mocked(mockRepo.findById!).mockResolvedValue(sampleAthlete);

      const result = await service.getProfile(sampleAthlete.id);

      expect(result).toEqual(sampleAthlete);
      expect(mockRepo.findById).toHaveBeenCalledWith(sampleAthlete.id);
    });

    it('should throw NotFoundError 404 when athlete does not exist', async () => {
      vi.mocked(mockRepo.findById!).mockResolvedValue(null);

      await expect(service.getProfile('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('should update profile and equipment successfully', async () => {
      const updateDto: UpdateProfileRequest = {
        name: 'Carlos R.',
        weight_kg: 80.0,
        training_goal: 'fuerza',
        equipment_ids: ['barbell']
      };

      const updatedAthlete: AthleteProfile = {
        ...sampleAthlete,
        name: 'Carlos R.',
        weight_kg: 80.0,
        training_goal: 'fuerza',
        equipment: [{ id: 'barbell', name: 'Barra Olímpica', category: 'barras_y_discos' }]
      };

      vi.mocked(mockRepo.findById!).mockResolvedValue(sampleAthlete);
      vi.mocked(mockRepo.update!).mockResolvedValue(updatedAthlete);

      const result = await service.updateProfile(sampleAthlete.id, updateDto);

      expect(result).toEqual(updatedAthlete);
      expect(mockRepo.update).toHaveBeenCalledWith(
        sampleAthlete.id,
        {
          name: 'Carlos R.',
          weight_kg: 80.0,
          training_goal: 'fuerza'
        },
        ['barbell']
      );
    });

    it('should throw NotFoundError when athlete to update does not exist', async () => {
      vi.mocked(mockRepo.findById!).mockResolvedValue(null);

      await expect(
        service.updateProfile('non-existent-id', { name: 'New Name' })
      ).rejects.toThrow(NotFoundError);

      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteProfile', () => {
    it('should soft-delete athlete profile successfully', async () => {
      vi.mocked(mockRepo.findById!).mockResolvedValue(sampleAthlete);
      vi.mocked(mockRepo.softDelete!).mockResolvedValue(true);

      const result = await service.deleteProfile(sampleAthlete.id);

      expect(result).toEqual({
        success: true,
        message: 'Cuenta eliminada exitosamente.'
      });
      expect(mockRepo.softDelete).toHaveBeenCalledWith(sampleAthlete.id);
    });

    it('should throw NotFoundError when athlete to delete does not exist', async () => {
      vi.mocked(mockRepo.findById!).mockResolvedValue(null);

      await expect(service.deleteProfile('non-existent-id')).rejects.toThrow(NotFoundError);
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });
  });
});
