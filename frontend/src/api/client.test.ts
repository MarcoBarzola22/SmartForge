import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  apiClient,
  setAuthToken,
  getAuthToken,
  ApiClientError
} from './client';
import type {
  AthleteProfile,
  CreateProfileRequest,
  MesocycleDetail,
  SyncRequest,
  SyncResponse
} from './generated/types';

describe('TASK-61: Typed API Client & TanStack Query Setup (RNF-07, DT-05)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    setAuthToken(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Auth Token Management', () => {
    it('should set and retrieve auth token', () => {
      expect(getAuthToken()).toBeNull();
      setAuthToken('mock-jwt-token-123');
      expect(getAuthToken()).toBe('mock-jwt-token-123');
    });

    it('should attach Authorization Bearer header when token is present', async () => {
      setAuthToken('token-abc');

      const mockResponse = { id: 'ath-1', email: 'test@smartforge.app' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse
      });

      await apiClient.auth.getMe();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token-abc'
          })
        })
      );
    });
  });

  describe('Typed Endpoint Methods', () => {
    it('should fetch current mesocycle using apiClient.mesocycles.getCurrent()', async () => {
      const mockMeso: Partial<MesocycleDetail> = {
        id: 'meso-1',
        athlete_id: 'ath-1',
        status: 'active'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockMeso
      });

      const data = await apiClient.mesocycles.getCurrent();
      expect(data).toEqual(mockMeso);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/mesocycles/current'),
        expect.anything()
      );
    });

    it('should create athlete profile with apiClient.profile.create()', async () => {
      const profileReq: CreateProfileRequest = {
        name: 'Carlos Forge',
        age: 25,
        weight_kg: 78,
        experience_level: 'intermedio',
        training_goal: 'hipertrofia',
        available_days_per_week: 4,
        equipment_ids: ['barbell']
      };

      const mockProfile: AthleteProfile = {
        id: 'ath-1',
        google_id: 'goog-1',
        email: 'carlos@test.com',
        created_at: '2026-09-12T00:00:00Z',
        updated_at: '2026-09-12T00:00:00Z',
        equipment: [{ id: 'barbell', name: 'Barra', category: 'barras' }],
        ...profileReq
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockProfile
      });

      const result = await apiClient.profile.create(profileReq);
      expect(result).toEqual(mockProfile);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/profile'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(profileReq)
        })
      );
    });

    it('should send sync batch with apiClient.sync.syncOffline()', async () => {
      const syncReq: SyncRequest = {
        sets: [
          {
            exercise_id: 'press_banca',
            set_number: 1,
            reps_completed: 10,
            weight_kg: 80,
            rir: 2,
            client_timestamp: '2026-09-12T10:00:00Z'
          }
        ]
      };

      const mockSyncRes: SyncResponse = {
        processed_count: 1,
        conflicts_count: 0,
        synced_at: '2026-09-12T10:01:00Z'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockSyncRes
      });

      const res = await apiClient.sync.syncOffline(syncReq);
      expect(res.processed_count).toBe(1);
      expect(res.conflicts_count).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw ApiClientError with status and error message on failed response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'La edad mínima requerida es 16 años'
          }
        })
      });

      await expect(
        apiClient.profile.create({
          name: 'Menor',
          age: 14,
          weight_kg: 50,
          experience_level: 'principiante',
          training_goal: 'fuerza',
          available_days_per_week: 3,
          equipment_ids: []
        })
      ).rejects.toThrow(ApiClientError);
    });
  });
});
