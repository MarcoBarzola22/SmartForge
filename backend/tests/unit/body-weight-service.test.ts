import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BodyWeightService, getCalendarWeekStart, getCalendarDaysDiff, addCalendarDays } from '../../src/services/body-weight.service.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../src/errors/app-error.js';
import type { BodyWeightLogRecord } from '../../src/repositories/body-weight.repository.js';
import type { AthleteProfile } from '../../src/schemas/generated/schemas.js';

describe('TASK-14: BodyWeightService (RF-01, RF-02)', () => {
  const sampleAthleteId = '11111111-1111-1111-1111-111111111111';

  const mockAthleteProfile: AthleteProfile = {
    id: sampleAthleteId,
    google_id: 'google-123',
    email: 'athlete@example.com',
    name: 'Test Athlete',
    age: 25,
    weight_kg: 75.0,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    equipment: []
  };

  let mockBodyWeightRepo: any;
  let mockAthleteRepo: any;
  let service: BodyWeightService;

  beforeEach(() => {
    mockBodyWeightRepo = {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findByWeek: vi.fn(),
      findHistoryByAthleteId: vi.fn(),
      findLatestBeforeDate: vi.fn(),
      findAdjacentLogs: vi.fn(),
      delete: vi.fn()
    };

    mockAthleteRepo = {
      findById: vi.fn().mockResolvedValue(mockAthleteProfile),
      update: vi.fn().mockResolvedValue(mockAthleteProfile)
    };

    service = new BodyWeightService(mockBodyWeightRepo, mockAthleteRepo);
  });

  describe('Date and Calendar Utilities', () => {
    it('should correctly calculate calendar week start (Monday) for any date', () => {
      // 2026-09-14 is Monday
      expect(getCalendarWeekStart('2026-09-14')).toBe('2026-09-14');
      // 2026-09-15 is Tuesday
      expect(getCalendarWeekStart('2026-09-15')).toBe('2026-09-14');
      // 2026-09-19 is Saturday
      expect(getCalendarWeekStart('2026-09-19')).toBe('2026-09-14');
      // 2026-09-20 is Sunday
      expect(getCalendarWeekStart('2026-09-20')).toBe('2026-09-14');
      // 2026-09-21 is next Monday
      expect(getCalendarWeekStart('2026-09-21')).toBe('2026-09-21');
    });

    it('should correctly calculate calendar days difference and date additions', () => {
      expect(getCalendarDaysDiff('2026-09-19', '2026-09-22')).toBe(3);
      expect(getCalendarDaysDiff('2026-09-19', '2026-09-24')).toBe(5);
      expect(addCalendarDays('2026-09-19', 5)).toBe('2026-09-24');
    });
  });

  describe('RF-01: Weight Log Creation & 120h Guard', () => {
    it('should reject weight below 30.0 kg or above 300.0 kg (CA-01.5)', async () => {
      await expect(
        service.createLog(sampleAthleteId, { weight_kg: 29.9, logged_date: '2026-09-14' })
      ).rejects.toThrow(BadRequestError);

      await expect(
        service.createLog(sampleAthleteId, { weight_kg: 300.1, logged_date: '2026-09-14' })
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject creation when a log already exists for the same calendar week (CA-01.4 #1)', async () => {
      const existingLog: BodyWeightLogRecord = {
        id: 'log-1',
        athlete_id: sampleAthleteId,
        weight_kg: 75.0,
        calendar_week_start: '2026-09-14',
        logged_date: '2026-09-14',
        logged_at_utc: '2026-09-14T08:00:00Z',
        updated_at_utc: '2026-09-14T08:00:00Z'
      };

      mockBodyWeightRepo.findByWeek.mockResolvedValueOnce(existingLog);

      await expect(
        service.createLog(sampleAthleteId, { weight_kg: 75.5, logged_date: '2026-09-16' })
      ).rejects.toThrow(ConflictError);

      expect(mockBodyWeightRepo.create).not.toHaveBeenCalled();
    });

    it('should reject creation when distance from previous log is less than 120 hours (5 days) (CA-01.4 #2)', async () => {
      // Previous log on Saturday 2026-09-19
      const prevLog: BodyWeightLogRecord = {
        id: 'log-prev',
        athlete_id: sampleAthleteId,
        weight_kg: 75.0,
        calendar_week_start: '2026-09-14',
        logged_date: '2026-09-19',
        logged_at_utc: '2026-09-19T08:00:00Z',
        updated_at_utc: '2026-09-19T08:00:00Z'
      };

      mockBodyWeightRepo.findByWeek.mockResolvedValueOnce(null);
      // New attempt on Tuesday 2026-09-22 (3 days difference < 5 days)
      mockBodyWeightRepo.findAdjacentLogs.mockResolvedValueOnce({
        previous: prevLog,
        next: null
      });

      await expect(
        service.createLog(sampleAthleteId, { weight_kg: 74.8, logged_date: '2026-09-22' })
      ).rejects.toThrow(/intervalo de al menos 5 días.*2026-09-24/i);

      expect(mockBodyWeightRepo.create).not.toHaveBeenCalled();
    });

    it('should reject creation when retroactive log is less than 120h from next log (CA-01.4, CA-02.2)', async () => {
      // Later log on Thursday 2026-09-24
      const nextLog: BodyWeightLogRecord = {
        id: 'log-next',
        athlete_id: sampleAthleteId,
        weight_kg: 74.5,
        calendar_week_start: '2026-09-21',
        logged_date: '2026-09-24',
        logged_at_utc: '2026-09-24T08:00:00Z',
        updated_at_utc: '2026-09-24T08:00:00Z'
      };

      mockBodyWeightRepo.findByWeek.mockResolvedValueOnce(null);
      // Retroactive attempt on Tuesday 2026-09-22 (2 days before Thursday < 5 days)
      mockBodyWeightRepo.findAdjacentLogs.mockResolvedValueOnce({
        previous: null,
        next: nextLog
      });

      await expect(
        service.createLog(sampleAthleteId, { weight_kg: 75.0, logged_date: '2026-09-22' })
      ).rejects.toThrow(/intervalo de al menos 5 días/i);

      expect(mockBodyWeightRepo.create).not.toHaveBeenCalled();
    });

    it('should successfully create weight log when 120h guard is respected and update athlete profile (CA-01.3)', async () => {
      const prevLog: BodyWeightLogRecord = {
        id: 'log-prev',
        athlete_id: sampleAthleteId,
        weight_kg: 75.0,
        calendar_week_start: '2026-09-14',
        logged_date: '2026-09-19',
        logged_at_utc: '2026-09-19T08:00:00Z',
        updated_at_utc: '2026-09-19T08:00:00Z'
      };

      mockBodyWeightRepo.findByWeek.mockResolvedValueOnce(null);
      // Thursday 2026-09-24 is 5 days from Saturday 2026-09-19 -> valid!
      mockBodyWeightRepo.findAdjacentLogs.mockResolvedValueOnce({
        previous: prevLog,
        next: null
      });

      const createdRecord: BodyWeightLogRecord = {
        id: 'log-new',
        athlete_id: sampleAthleteId,
        weight_kg: 74.2,
        calendar_week_start: '2026-09-21',
        logged_date: '2026-09-24',
        logged_at_utc: '2026-09-24T09:00:00Z',
        updated_at_utc: '2026-09-24T09:00:00Z'
      };
      mockBodyWeightRepo.create.mockResolvedValueOnce(createdRecord);
      mockBodyWeightRepo.findLatestBeforeDate.mockResolvedValueOnce(createdRecord);

      const result = await service.createLog(sampleAthleteId, {
        weight_kg: 74.24, // should be rounded to 74.2
        logged_date: '2026-09-24'
      });

      expect(result.id).toBe('log-new');
      expect(result.weight_kg).toBe(74.2);
      expect(result.calendar_week_start).toBe('2026-09-21');
      expect(mockBodyWeightRepo.create).toHaveBeenCalledWith({
        athlete_id: sampleAthleteId,
        weight_kg: 74.2,
        calendar_week_start: '2026-09-21',
        logged_date: '2026-09-24'
      });
      // Profile reference weight should be updated because it is the latest log
      expect(mockAthleteRepo.update).toHaveBeenCalledWith(sampleAthleteId, { weight_kg: 74.2 });
    });

    it('should NOT overwrite profile weight_kg if newly created log is retroactive and older than latest log', async () => {
      mockBodyWeightRepo.findByWeek.mockResolvedValueOnce(null);
      mockBodyWeightRepo.findAdjacentLogs.mockResolvedValueOnce({
        previous: null,
        next: null
      });

      const createdRetroRecord: BodyWeightLogRecord = {
        id: 'log-retro',
        athlete_id: sampleAthleteId,
        weight_kg: 76.0,
        calendar_week_start: '2026-08-10',
        logged_date: '2026-08-12',
        logged_at_utc: '2026-08-12T09:00:00Z',
        updated_at_utc: '2026-08-12T09:00:00Z'
      };
      mockBodyWeightRepo.create.mockResolvedValueOnce(createdRetroRecord);

      // Latest log in DB is from September (newer than August)
      const newerLog: BodyWeightLogRecord = {
        id: 'log-latest',
        athlete_id: sampleAthleteId,
        weight_kg: 74.0,
        calendar_week_start: '2026-09-14',
        logged_date: '2026-09-18',
        logged_at_utc: '2026-09-18T09:00:00Z',
        updated_at_utc: '2026-09-18T09:00:00Z'
      };
      mockBodyWeightRepo.findLatestBeforeDate.mockResolvedValueOnce(newerLog);

      await service.createLog(sampleAthleteId, {
        weight_kg: 76.0,
        logged_date: '2026-08-12'
      });

      // Athlete profile should NOT be updated with older weight
      expect(mockAthleteRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('RF-02: Controlled Editing (CA-02.3, CA-02.4)', () => {
    const existingLog: BodyWeightLogRecord = {
      id: 'log-edit',
      athlete_id: sampleAthleteId,
      weight_kg: 75.0,
      calendar_week_start: '2026-09-14',
      logged_date: '2026-09-16', // Wednesday
      logged_at_utc: '2026-09-16T08:00:00Z',
      updated_at_utc: '2026-09-16T08:00:00Z'
    };

    it('should throw NotFoundError if log does not exist or belongs to another athlete', async () => {
      mockBodyWeightRepo.findById.mockResolvedValueOnce(null);

      await expect(
        service.updateLog(sampleAthleteId, 'non-existent', { weight_kg: 74.5 })
      ).rejects.toThrow(NotFoundError);
    });

    it('should reject editing if new logged_date crosses to a different calendar week (CA-02.4)', async () => {
      mockBodyWeightRepo.findById.mockResolvedValueOnce(existingLog);

      // 2026-09-22 is next week's Tuesday (different calendar week)
      await expect(
        service.updateLog(sampleAthleteId, 'log-edit', { logged_date: '2026-09-22' })
      ).rejects.toThrow(/misma semana calendario/i);

      expect(mockBodyWeightRepo.update).not.toHaveBeenCalled();
    });

    it('should reject editing if new logged_date violates 120h distance with adjacent logs (CA-02.4)', async () => {
      mockBodyWeightRepo.findById.mockResolvedValueOnce(existingLog);

      const prevLog: BodyWeightLogRecord = {
        id: 'log-prev',
        athlete_id: sampleAthleteId,
        weight_kg: 76.0,
        calendar_week_start: '2026-09-07',
        logged_date: '2026-09-12', // Saturday before
        logged_at_utc: '2026-09-12T08:00:00Z',
        updated_at_utc: '2026-09-12T08:00:00Z'
      };

      // Changing from Wed 16 to Mon 14 -> 2026-09-14 - 2026-09-12 = 2 days < 5 days
      mockBodyWeightRepo.findAdjacentLogs.mockResolvedValueOnce({
        previous: prevLog,
        next: null
      });

      await expect(
        service.updateLog(sampleAthleteId, 'log-edit', { logged_date: '2026-09-14' })
      ).rejects.toThrow(/intervalo de al menos 5 días/i);
    });

    it('should successfully update weight and day within the same week respecting 120h guard', async () => {
      mockBodyWeightRepo.findById.mockResolvedValueOnce(existingLog);

      // Changing to Friday 2026-09-18 (same week)
      mockBodyWeightRepo.findAdjacentLogs.mockResolvedValueOnce({
        previous: null,
        next: null
      });

      const updatedRecord: BodyWeightLogRecord = {
        ...existingLog,
        weight_kg: 74.8,
        logged_date: '2026-09-18'
      };
      mockBodyWeightRepo.update.mockResolvedValueOnce(updatedRecord);
      mockBodyWeightRepo.findLatestBeforeDate.mockResolvedValueOnce(updatedRecord);

      const result = await service.updateLog(sampleAthleteId, 'log-edit', {
        weight_kg: 74.8,
        logged_date: '2026-09-18'
      });

      expect(result.weight_kg).toBe(74.8);
      expect(result.logged_date).toBe('2026-09-18');
      expect(mockBodyWeightRepo.update).toHaveBeenCalledWith('log-edit', sampleAthleteId, {
        weight_kg: 74.8,
        logged_date: '2026-09-18',
        calendar_week_start: '2026-09-14'
      });
    });
  });

  describe('RF-02: Batch Retroactive Logging (CA-02.2)', () => {
    it('should successfully process multiple retroactive logs separated by >= 120h', async () => {
      mockBodyWeightRepo.findByWeek.mockResolvedValue(null);
      mockBodyWeightRepo.findAdjacentLogs.mockResolvedValue({ previous: null, next: null });

      const fakeCreated1: BodyWeightLogRecord = {
        id: 'batch-1',
        athlete_id: sampleAthleteId,
        weight_kg: 77.0,
        calendar_week_start: '2026-08-17',
        logged_date: '2026-08-19',
        logged_at_utc: '2026-08-19T08:00:00Z',
        updated_at_utc: '2026-08-19T08:00:00Z'
      };

      const fakeCreated2: BodyWeightLogRecord = {
        id: 'batch-2',
        athlete_id: sampleAthleteId,
        weight_kg: 76.2,
        calendar_week_start: '2026-08-24',
        logged_date: '2026-08-26',
        logged_at_utc: '2026-08-26T08:00:00Z',
        updated_at_utc: '2026-08-26T08:00:00Z'
      };

      mockBodyWeightRepo.create
        .mockResolvedValueOnce(fakeCreated1)
        .mockResolvedValueOnce(fakeCreated2);

      const results = await service.createBatchLogs(sampleAthleteId, [
        { weight_kg: 77.0, logged_date: '2026-08-19' },
        { weight_kg: 76.2, logged_date: '2026-08-26' }
      ]);

      expect(results).toHaveLength(2);
      expect(mockBodyWeightRepo.create).toHaveBeenCalledTimes(2);
    });

    it('should reject batch if items within the batch violate 120h gap or calendar week uniqueness', async () => {
      // 2026-08-19 and 2026-08-21 are in the same calendar week and only 2 days apart
      await expect(
        service.createBatchLogs(sampleAthleteId, [
          { weight_kg: 77.0, logged_date: '2026-08-19' },
          { weight_kg: 76.5, logged_date: '2026-08-21' }
        ])
      ).rejects.toThrow();
    });
  });

  describe('RF-02: History Listing & Delta Calculation (CA-02.1)', () => {
    it('should list history in descending order and compute delta_kg against previous chronological log', async () => {
      const logsDesc: BodyWeightLogRecord[] = [
        {
          id: 'log-3',
          athlete_id: sampleAthleteId,
          weight_kg: 73.5,
          calendar_week_start: '2026-09-28',
          logged_date: '2026-09-30',
          logged_at_utc: '2026-09-30T08:00:00Z',
          updated_at_utc: '2026-09-30T08:00:00Z'
        },
        {
          id: 'log-2',
          athlete_id: sampleAthleteId,
          weight_kg: 74.0,
          calendar_week_start: '2026-09-21',
          logged_date: '2026-09-23',
          logged_at_utc: '2026-09-23T08:00:00Z',
          updated_at_utc: '2026-09-23T08:00:00Z'
        },
        {
          id: 'log-1',
          athlete_id: sampleAthleteId,
          weight_kg: 75.2,
          calendar_week_start: '2026-09-14',
          logged_date: '2026-09-16',
          logged_at_utc: '2026-09-16T08:00:00Z',
          updated_at_utc: '2026-09-16T08:00:00Z'
        }
      ];

      mockBodyWeightRepo.findHistoryByAthleteId.mockResolvedValueOnce(logsDesc);

      const history = await service.getHistory(sampleAthleteId);

      expect(history).toHaveLength(3);
      // log-3 delta against log-2: 73.5 - 74.0 = -0.5 kg
      expect(history[0].delta_kg).toBe(-0.5);
      // log-2 delta against log-1: 74.0 - 75.2 = -1.2 kg
      expect(history[1].delta_kg).toBe(-1.2);
      // log-1 is the oldest log: delta is null
      expect(history[2].delta_kg).toBeNull();
    });
  });

  describe('RF-06 CA-06.3: Carry-Forward Weight Resolution', () => {
    it('should resolve body weight from latest known log before or equal to date', async () => {
      const activeLog: BodyWeightLogRecord = {
        id: 'log-cf',
        athlete_id: sampleAthleteId,
        weight_kg: 74.3,
        calendar_week_start: '2026-09-14',
        logged_date: '2026-09-16',
        logged_at_utc: '2026-09-16T08:00:00Z',
        updated_at_utc: '2026-09-16T08:00:00Z'
      };

      mockBodyWeightRepo.findLatestBeforeDate.mockResolvedValueOnce(activeLog);

      const resolved = await service.resolveCurrentWeight(sampleAthleteId, '2026-09-18');
      expect(resolved).toBe(74.3);
      expect(mockBodyWeightRepo.findLatestBeforeDate).toHaveBeenCalledWith(sampleAthleteId, '2026-09-18');
    });

    it('should fall back to athlete profile weight_kg when no prior logs exist', async () => {
      mockBodyWeightRepo.findLatestBeforeDate.mockResolvedValueOnce(null);

      const resolved = await service.resolveCurrentWeight(sampleAthleteId, '2026-07-01');
      expect(resolved).toBe(75.0);
    });
  });

  describe('Inmutability (CA-02.5)', () => {
    it('verifies that editing a weight log does not touch set_log or historical performance records', async () => {
      const existingLog: BodyWeightLogRecord = {
        id: 'log-imm',
        athlete_id: sampleAthleteId,
        weight_kg: 75.0,
        calendar_week_start: '2026-09-14',
        logged_date: '2026-09-16',
        logged_at_utc: '2026-09-16T08:00:00Z',
        updated_at_utc: '2026-09-16T08:00:00Z'
      };

      mockBodyWeightRepo.findById.mockResolvedValueOnce(existingLog);
      mockBodyWeightRepo.findAdjacentLogs.mockResolvedValueOnce({ previous: null, next: null });
      mockBodyWeightRepo.update.mockResolvedValueOnce({ ...existingLog, weight_kg: 74.0 });
      mockBodyWeightRepo.findLatestBeforeDate.mockResolvedValueOnce(existingLog);

      await service.updateLog(sampleAthleteId, 'log-imm', { weight_kg: 74.0 });

      // Ensure no calls are made to delete or modify exercise logs or set logs
      expect(mockBodyWeightRepo.update).toHaveBeenCalled();
    });
  });
});
