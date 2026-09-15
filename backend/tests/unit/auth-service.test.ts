import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../src/services/auth.service.js';
import type { AthleteRepository } from '../../src/repositories/athlete.repository.js';
import type { AthleteProfile } from '../../src/schemas/generated/schemas.js';
import { NotFoundError, UnauthorizedError } from '../../src/errors/app-error.js';

describe('TASK-22: AuthService', () => {
  let mockRepo: Partial<AthleteRepository>;
  let mockVerifyGoogleToken: ReturnType<typeof vi.fn>;
  let mockExchangeCode: ReturnType<typeof vi.fn>;
  let service: AuthService;

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
      { id: 'barbell', name: 'Barra Olímpica', category: 'barras_y_discos' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByGoogleId: vi.fn(),
      findByEmail: vi.fn()
    };
    mockVerifyGoogleToken = vi.fn();
    mockExchangeCode = vi.fn().mockImplementation(async (code: string) => code);
    service = new AuthService(mockRepo as AthleteRepository, mockVerifyGoogleToken as any, mockExchangeCode as any);
  });

  describe('handleGoogleAuth', () => {
    it('should return is_profile_complete=true and athlete profile when athlete exists', async () => {
      mockVerifyGoogleToken.mockResolvedValue({
        googleId: 'google-uid-12345',
        email: 'athlete@example.com',
        name: 'Carlos Ruiz'
      });
      vi.mocked(mockRepo.findByGoogleId!).mockResolvedValue(sampleAthlete);

      const result = await service.handleGoogleAuth('valid-google-id-token');

      expect(result.is_profile_complete).toBe(true);
      expect(result.profile).toEqual(sampleAthlete);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(mockVerifyGoogleToken).toHaveBeenCalledWith('valid-google-id-token');
      expect(mockRepo.findByGoogleId).toHaveBeenCalledWith('google-uid-12345');
    });

    it('should return is_profile_complete=false and onboarding token when athlete does not exist', async () => {
      mockVerifyGoogleToken.mockResolvedValue({
        googleId: 'new-google-uid-999',
        email: 'newbie@example.com',
        name: 'New Athlete'
      });
      vi.mocked(mockRepo.findByGoogleId!).mockResolvedValue(null);
      vi.mocked(mockRepo.findByEmail!).mockResolvedValue(null);

      const result = await service.handleGoogleAuth('new-user-id-token');

      expect(result.is_profile_complete).toBe(false);
      expect(result.profile).toBeUndefined();
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(mockVerifyGoogleToken).toHaveBeenCalledWith('new-user-id-token');
      expect(mockRepo.findByGoogleId).toHaveBeenCalledWith('new-google-uid-999');
    });

    it('should throw UnauthorizedError when Google token is invalid', async () => {
      mockVerifyGoogleToken.mockRejectedValue(new UnauthorizedError('Token de Google inválido.'));

      await expect(service.handleGoogleAuth('invalid-token')).rejects.toThrow(UnauthorizedError);
      expect(mockRepo.findByGoogleId).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return athlete profile when athlete exists', async () => {
      vi.mocked(mockRepo.findById!).mockResolvedValue(sampleAthlete);

      const result = await service.getCurrentUser(sampleAthlete.id);

      expect(result).toEqual(sampleAthlete);
      expect(mockRepo.findById).toHaveBeenCalledWith(sampleAthlete.id);
    });

    it('should throw NotFoundError when athlete is not found', async () => {
      vi.mocked(mockRepo.findById!).mockResolvedValue(null);

      await expect(service.getCurrentUser('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getGoogleAuthUrl', () => {
    it('should generate Google OAuth URL with proper parameters', () => {
      const url = service.getGoogleAuthUrl();

      expect(url).toContain('accounts.google.com');
      expect(url).toContain('client_id=');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=');
    });
  });
});
