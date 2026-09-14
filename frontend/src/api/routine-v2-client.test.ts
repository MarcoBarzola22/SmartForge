import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  apiClient,
  setAuthToken,
  ApiClientError,
  fetchWeightLogs,
  createWeightLog,
  updateWeightLog,
  fetchTimeBlockConfig,
  createMesocycleV2,
  cancelActiveMesocycle,
  fetchMesocycleHistory
} from './client';
import type {
  WeightLogItem,
  CreateWeightLogRequest,
  UpdateWeightLogRequest,
  RoutineTimeBlockItem,
  GenerateMesocycleRequest,
  MesocycleDetail,
  MesocycleHistoryItem,
  CancelActiveMesocycleResponse
} from './generated/types';

describe('TASK-29: Typed Client Methods for Body Weight, Routine V2 Config & Mesocycles (RF-01, RF-02, RF-03, RF-06, RF-07, Constitución §1)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    setAuthToken(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // =========================================================================
  // 1. fetchWeightLogs() & apiClient.weightLogs.list()
  // =========================================================================
  describe('fetchWeightLogs() (RF-02)', () => {
    const mockLogs: WeightLogItem[] = [
      {
        id: 'log-1',
        athlete_id: 'ath-1',
        weight_kg: 78.5,
        calendar_week_start: '2026-09-07',
        logged_date: '2026-09-09',
        delta_kg: -0.5,
        created_at: '2026-09-09T08:00:00Z',
        updated_at: '2026-09-09T08:00:00Z'
      },
      {
        id: 'log-2',
        athlete_id: 'ath-1',
        weight_kg: 79.0,
        calendar_week_start: '2026-08-31',
        logged_date: '2026-09-02',
        delta_kg: null,
        created_at: '2026-09-02T08:00:00Z'
      }
    ];

    it('should fetch weight logs and unwrap { logs: [...] } payload', async () => {
      setAuthToken('token-auth-xyz');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ logs: mockLogs })
      });

      const result = await fetchWeightLogs();

      expect(result).toEqual(mockLogs);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/athletes/me/weight-logs'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token-auth-xyz',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should also handle response if backend returns array directly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockLogs
      });

      const result = await fetchWeightLogs();
      expect(result).toEqual(mockLogs);
    });

    it('should return empty array when athlete has no registered logs', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ logs: [] })
      });

      const result = await fetchWeightLogs();
      expect(result).toEqual([]);
    });

    it('should throw ApiClientError with 401 when unauthenticated', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'UNAUTHORIZED',
            message: 'No autorizado.'
          }
        })
      });

      await expect(fetchWeightLogs()).rejects.toThrow(ApiClientError);
      await expect(fetchWeightLogs()).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED'
      });
    });
  });

  // =========================================================================
  // 2. createWeightLog() & updateWeightLog()
  // =========================================================================
  describe('createWeightLog() & updateWeightLog() (RF-01, RF-02)', () => {
    const validPayload: CreateWeightLogRequest = {
      weight_kg: 76.2,
      logged_date: '2026-09-14'
    };

    const createdLog: WeightLogItem = {
      id: 'log-new-1',
      athlete_id: 'ath-1',
      weight_kg: 76.2,
      calendar_week_start: '2026-09-14',
      logged_date: '2026-09-14',
      delta_kg: -0.3,
      created_at: '2026-09-14T09:00:00Z'
    };

    it('should create weight log and unwrap { log: ... } on 201 Created', async () => {
      setAuthToken('token-auth-xyz');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ log: createdLog })
      });

      const result = await createWeightLog(validPayload);

      expect(result).toEqual(createdLog);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/athletes/me/weight-logs'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(validPayload),
          headers: expect.objectContaining({
            Authorization: 'Bearer token-auth-xyz',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('edge case: should throw ApiClientError (400) when weight is out of range (< 30 kg or > 300 kg)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'Error de validación',
          code: 'VALIDATION_ERROR',
          details: [{ field: 'weight_kg', message: 'El peso debe estar entre 30.0 y 300.0 kg' }]
        })
      });

      await expect(
        createWeightLog({ weight_kg: 25.0, logged_date: '2026-09-14' })
      ).rejects.toMatchObject({
        status: 400,
        code: 'VALIDATION_ERROR'
      });
    });

    it('edge case: should throw ApiClientError (409) when weight collides with same calendar week', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'Ya existe un pesaje registrado para la semana del 2026-09-14.',
          code: 'CONFLICT'
        })
      });

      await expect(
        createWeightLog({ weight_kg: 76.5, logged_date: '2026-09-14' })
      ).rejects.toMatchObject({
        status: 409,
        code: 'CONFLICT'
      });
    });

    it('should update existing weight log with updateWeightLog()', async () => {
      const updatePayload: UpdateWeightLogRequest = {
        weight_kg: 75.8,
        logged_date: '2026-09-15'
      };

      const updatedLog: WeightLogItem = {
        ...createdLog,
        weight_kg: 75.8,
        logged_date: '2026-09-15',
        delta_kg: -0.7
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ log: updatedLog })
      });

      const result = await updateWeightLog('log-new-1', updatePayload);
      expect(result).toEqual(updatedLog);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/athletes/me/weight-logs/log-new-1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updatePayload)
        })
      );
    });
  });

  // =========================================================================
  // 3. fetchTimeBlockConfig()
  // =========================================================================
  describe('fetchTimeBlockConfig() (RF-03, RF-04)', () => {
    const mockBlocks: RoutineTimeBlockItem[] = [
      { duration_minutes: 30, min_exercises: 2, max_exercises: 3, recommended_exercises: 3 },
      { duration_minutes: 45, min_exercises: 3, max_exercises: 5, recommended_exercises: 4 },
      { duration_minutes: 60, min_exercises: 4, max_exercises: 6, recommended_exercises: 5 },
      { duration_minutes: 75, min_exercises: 5, max_exercises: 7, recommended_exercises: 6 },
      { duration_minutes: 90, min_exercises: 6, max_exercises: 8, recommended_exercises: 7 },
      { duration_minutes: 120, min_exercises: 7, max_exercises: 10, recommended_exercises: 8 }
    ];

    it('should fetch time block config and unwrap { available_blocks: [...] }', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ available_blocks: mockBlocks })
      });

      const result = await fetchTimeBlockConfig();

      expect(result).toEqual(mockBlocks);
      expect(result).toHaveLength(6);
      expect(result[0]!.duration_minutes).toBe(30);
      expect(result[5]!.duration_minutes).toBe(120);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/routines/config/time-blocks'),
        expect.anything()
      );
    });

    it('should also handle direct array response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockBlocks
      });

      const result = await fetchTimeBlockConfig();
      expect(result).toEqual(mockBlocks);
    });

    it('should throw ApiClientError on 401 unauthorized', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ code: 'UNAUTHORIZED', error: 'No autorizado' })
      });

      await expect(fetchTimeBlockConfig()).rejects.toThrow(ApiClientError);
    });
  });

  // =========================================================================
  // 4. createMesocycleV2()
  // =========================================================================
  describe('createMesocycleV2() (RF-03, RF-04, RF-05)', () => {
    const mesoRequest: GenerateMesocycleRequest = {
      target_goal: 'hipertrofia',
      availableDays: 4,
      sessionDurationMinutes: 60,
      exercisesPerSessionPreference: {
        mode: 'recommended'
      }
    };

    const mockDetail: Partial<MesocycleDetail> = {
      id: 'meso-v2-123',
      athlete_id: 'ath-1',
      name: 'Mesociclo V2 Hipertrofia',
      duration_weeks: 6,
      status: 'active',
      start_date: '2026-09-14',
      end_date: '2026-10-26'
    };

    it('should generate mesocycle V2 with valid payload', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockDetail
      });

      const result = await createMesocycleV2(mesoRequest);

      expect(result).toEqual(mockDetail);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/mesocycles'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mesoRequest)
        })
      );
    });

    it('edge case: should throw ApiClientError (400) when customCount exceeds duration budget', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'El número de ejercicios manual (6) excede el presupuesto para 30 minutos (máx 3).',
          code: 'DURATION_BUDGET_EXCEEDED'
        })
      });

      await expect(
        createMesocycleV2({
          sessionDurationMinutes: 30,
          exercisesPerSessionPreference: {
            mode: 'manual',
            customCount: 6
          }
        })
      ).rejects.toMatchObject({
        status: 400,
        code: 'DURATION_BUDGET_EXCEEDED'
      });
    });
  });

  // =========================================================================
  // 5. cancelActiveMesocycle()
  // =========================================================================
  describe('cancelActiveMesocycle() (RF-07, RF-08)', () => {
    const mockCancelResponse: CancelActiveMesocycleResponse = {
      status: 'cancelled',
      message: 'Mesociclo cancelado exitosamente. Sesiones guardadas en historial.',
      cancelled_at: '2026-09-14T10:00:00.000Z'
    };

    it('should send POST /mesocycles/active/cancel with reason', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockCancelResponse
      });

      const result = await cancelActiveMesocycle('cambio_horario');

      expect(result).toEqual(mockCancelResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/mesocycles/active/cancel'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reason: 'cambio_horario' })
        })
      );
    });

    it('should support calling cancelActiveMesocycle() without reason', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockCancelResponse
      });

      const result = await cancelActiveMesocycle();

      expect(result.status).toBe('cancelled');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/mesocycles/active/cancel'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({})
        })
      );
    });

    it('edge case: should throw ApiClientError (404) when no active mesocycle exists', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'No se encontró ningún mesociclo activo para cancelar.',
          code: 'NOT_FOUND'
        })
      });

      await expect(cancelActiveMesocycle()).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND'
      });
    });
  });

  // =========================================================================
  // 6. fetchMesocycleHistory()
  // =========================================================================
  describe('fetchMesocycleHistory() (RF-06)', () => {
    const mockHistory: MesocycleHistoryItem[] = [
      {
        id: 'meso-hist-1',
        name: 'Mesociclo V2 Finalizado',
        goal: 'hipertrofia',
        startDate: '2026-07-01',
        endDate: '2026-08-12',
        status: 'completed',
        adherencePercent: 96,
        adherenceDetails: '23 de 24 sesiones completadas',
        exerciseProgressions: [
          {
            exerciseId: 'bench_press',
            exerciseName: 'Press de banca plano con barra',
            loadType: 'external_load',
            baseline: {
              loadText: '70.0 kg × 8 reps',
              e1rmKg: 86.87
            },
            final: {
              loadText: '75.0 kg × 8 reps',
              e1rmKg: 93.08,
              executed: true
            },
            progress: {
              deltaKg: 6.21,
              deltaPercent: 7.1
            }
          }
        ]
      }
    ];

    it('should fetch history and return array of MesocycleHistoryItem', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockHistory
      });

      const result = await fetchMesocycleHistory();

      expect(result).toEqual(mockHistory);
      expect(result).toHaveLength(1);
      expect(result[0]!.exerciseProgressions[0]!.progress?.deltaKg).toBe(6.21);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/mesocycles/history'),
        expect.anything()
      );
    });

    it('should unwrap { mesocycles: [...] } if backend wraps it', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ mesocycles: mockHistory })
      });

      const result = await fetchMesocycleHistory();
      expect(result).toEqual(mockHistory);
    });

    it('should return empty list when athlete has no completed or cancelled cycles', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => []
      });

      const result = await fetchMesocycleHistory();
      expect(result).toEqual([]);
    });

    it('should throw ApiClientError (401) if unauthenticated', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'No autorizado.',
          code: 'UNAUTHORIZED'
        })
      });

      await expect(fetchMesocycleHistory()).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED'
      });
    });
  });

  // =========================================================================
  // 7. Integration with apiClient object
  // =========================================================================
  describe('apiClient Object Integration', () => {
    it('should have apiClient.weightLogs methods delegating properly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ logs: [] })
      });

      await apiClient.weightLogs.list();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/athletes/me/weight-logs'),
        expect.anything()
      );
    });

    it('should have apiClient.routineConfig.getTimeBlocks method', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ available_blocks: [] })
      });

      await apiClient.routineConfig.getTimeBlocks();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/routines/config/time-blocks'),
        expect.anything()
      );
    });

    it('should have apiClient.mesocycles V2 methods (createV2, cancelActive, getHistory)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => []
      });

      await apiClient.mesocycles.getHistory();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/mesocycles/history'),
        expect.anything()
      );
    });
  });
});
