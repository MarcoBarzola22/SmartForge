import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BodyWeightService,
  getCalendarWeekStart,
  getCalendarDaysDiff,
  addCalendarDays
} from '../../src/services/body-weight.service.js';
import { BodyWeightRepository } from '../../src/repositories/body-weight.repository.js';
import { AthleteRepository } from '../../src/repositories/athlete.repository.js';
import { setLogRepository } from '../../src/repositories/set-log.repository.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../src/errors/app-error.js';
import type { BodyWeightLogRecord } from '../../src/repositories/body-weight.repository.js';

describe('TASK-24: BodyWeightService Unit Tests (RF-01, RF-02, Constitución Art. 4)', () => {
  let service: BodyWeightService;
  let mockBodyWeightRepo: BodyWeightRepository;
  let mockAthleteRepo: AthleteRepository;

  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const logId = '9ba7b810-9dad-11d1-80b4-00c04fd430cc';

  const baseRecord: BodyWeightLogRecord = {
    id: logId,
    athlete_id: athleteId,
    weight_kg: 75.0,
    calendar_week_start: '2026-09-07',
    logged_date: '2026-09-08',
    logged_at_utc: '2026-09-08T10:00:00.000Z',
    updated_at_utc: '2026-09-08T10:00:00.000Z'
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    mockBodyWeightRepo = new BodyWeightRepository({} as any);
    mockAthleteRepo = new AthleteRepository({} as any);

    service = new BodyWeightService(mockBodyWeightRepo, mockAthleteRepo);
  });

  describe('1. Funciones auxiliares de calendario y guarda de 120h', () => {
    it('getCalendarWeekStart debe resolver el lunes inicial de la semana UTC', () => {
      // 2026-09-09 es miércoles -> lunes 2026-09-07
      expect(getCalendarWeekStart('2026-09-09')).toBe('2026-09-07');
      // 2026-09-13 es domingo -> lunes 2026-09-07
      expect(getCalendarWeekStart('2026-09-13')).toBe('2026-09-07');
      // 2026-09-14 es lunes -> lunes 2026-09-14
      expect(getCalendarWeekStart('2026-09-14')).toBe('2026-09-14');
    });

    it('getCalendarDaysDiff debe calcular la distancia en días enteros entre fechas', () => {
      expect(getCalendarDaysDiff('2026-09-08', '2026-09-13')).toBe(5);
      expect(getCalendarDaysDiff('2026-09-08', '2026-09-10')).toBe(2);
      expect(getCalendarDaysDiff('2026-09-15', '2026-09-10')).toBe(-5);
    });

    it('addCalendarDays debe sumar días a una fecha calendario en formato YYYY-MM-DD', () => {
      expect(addCalendarDays('2026-09-08', 5)).toBe('2026-09-13');
      expect(addCalendarDays('2026-09-28', 5)).toBe('2026-10-03');
    });
  });

  describe('2. Validación de rango (30.0 kg – 300.0 kg) (RF-01 CA-01.5)', () => {
    it('debe rechazar pesos inferiores a 30.0 kg con BadRequestError', async () => {
      await expect(service.createLog(athleteId, { weight_kg: 29.9, logged_date: '2026-09-14' }))
        .rejects.toThrow(BadRequestError);
      await expect(service.createLog(athleteId, { weight_kg: 0, logged_date: '2026-09-14' }))
        .rejects.toThrow(BadRequestError);
      await expect(service.createLog(athleteId, { weight_kg: -75.0, logged_date: '2026-09-14' }))
        .rejects.toThrow(BadRequestError);
    });

    it('debe rechazar pesos superiores a 300.0 kg con BadRequestError', async () => {
      await expect(service.createLog(athleteId, { weight_kg: 300.1, logged_date: '2026-09-14' }))
        .rejects.toThrow(BadRequestError);
      await expect(service.createLog(athleteId, { weight_kg: 500.0, logged_date: '2026-09-14' }))
        .rejects.toThrow(BadRequestError);
    });

    it('debe rechazar valores no numéricos o NaN', async () => {
      await expect(service.createLog(athleteId, { weight_kg: Number.NaN, logged_date: '2026-09-14' }))
        .rejects.toThrow(BadRequestError);
    });

    it('debe aceptar los valores límite 30.0 kg y 300.0 kg y redondear a 1 decimal', async () => {
      vi.spyOn(mockBodyWeightRepo, 'findByWeek').mockResolvedValue(null);
      vi.spyOn(mockBodyWeightRepo, 'findAdjacentLogs').mockResolvedValue({ previous: null, next: null });
      vi.spyOn(mockBodyWeightRepo, 'create').mockImplementation(async (data) => ({
        ...baseRecord,
        weight_kg: data.weight_kg,
        calendar_week_start: data.calendar_week_start,
        logged_date: data.logged_date
      }));
      vi.spyOn(mockBodyWeightRepo, 'findLatestBeforeDate').mockResolvedValue(baseRecord);
      vi.spyOn(mockAthleteRepo, 'update').mockResolvedValue({} as any);

      const logMin = await service.createLog(athleteId, { weight_kg: 30.0, logged_date: '2026-09-14' });
      expect(logMin.weight_kg).toBe(30.0);

      const logMax = await service.createLog(athleteId, { weight_kg: 300.0, logged_date: '2026-09-21' });
      expect(logMax.weight_kg).toBe(300.0);

      const logRounded = await service.createLog(athleteId, { weight_kg: 74.56, logged_date: '2026-09-28' });
      expect(logRounded.weight_kg).toBe(74.6);
    });

    it('debe validar el rango en updateLog al modificar el peso', async () => {
      vi.spyOn(mockBodyWeightRepo, 'findById').mockResolvedValue(baseRecord);

      await expect(service.updateLog(athleteId, logId, { weight_kg: 25.0 }))
        .rejects.toThrow(BadRequestError);
      await expect(service.updateLog(athleteId, logId, { weight_kg: 305.0 }))
        .rejects.toThrow(BadRequestError);
    });
  });

  describe('3. Colisión en la misma semana calendario (RF-01 CA-01.4 #1)', () => {
    it('debe rechazar con ConflictError si ya existe un pesaje en la misma semana calendario', async () => {
      vi.spyOn(mockBodyWeightRepo, 'findByWeek').mockResolvedValue(baseRecord);

      await expect(service.createLog(athleteId, { weight_kg: 74.5, logged_date: '2026-09-10' }))
        .rejects.toThrow(ConflictError);
    });

    it('updateLog debe rechazar si la nueva fecha no pertenece a la misma semana calendario', async () => {
      vi.spyOn(mockBodyWeightRepo, 'findById').mockResolvedValue(baseRecord); // semana '2026-09-07'

      await expect(service.updateLog(athleteId, logId, { logged_date: '2026-09-15' })) // semana '2026-09-14'
        .rejects.toThrow(/misma semana calendario/i);
    });

    it('updateLog debe permitir modificar la fecha dentro de la misma semana calendario', async () => {
      vi.spyOn(mockBodyWeightRepo, 'findById').mockResolvedValue(baseRecord); // logged_date: '2026-09-08'
      vi.spyOn(mockBodyWeightRepo, 'findAdjacentLogs').mockResolvedValue({ previous: null, next: null });
      vi.spyOn(mockBodyWeightRepo, 'update').mockResolvedValue({
        ...baseRecord,
        logged_date: '2026-09-11',
        weight_kg: 74.8
      });
      vi.spyOn(mockBodyWeightRepo, 'findLatestBeforeDate').mockResolvedValue({
        ...baseRecord,
        logged_date: '2026-09-11',
        weight_kg: 74.8
      });
      vi.spyOn(mockAthleteRepo, 'update').mockResolvedValue({} as any);

      const updated = await service.updateLog(athleteId, logId, {
        weight_kg: 74.8,
        logged_date: '2026-09-11' // Mismo lunes '2026-09-07'
      });

      expect(updated.logged_date).toBe('2026-09-11');
      expect(updated.weight_kg).toBe(74.8);
    });
  });

  describe('4. Rechazo por intervalo < 120 h (5 días) con pesajes adyacentes (RF-01 CA-01.4 #2)', () => {
    it('debe rechazar createLog si dista menos de 5 días del pesaje anterior adyacente', async () => {
      vi.spyOn(mockBodyWeightRepo, 'findByWeek').mockResolvedValue(null);

      const previousLog: BodyWeightLogRecord = {
        ...baseRecord,
        logged_date: '2026-09-12' // Sábado
      };

      vi.spyOn(mockBodyWeightRepo, 'findAdjacentLogs').mockResolvedValue({
        previous: previousLog,
        next: null
      });

      // Intento el martes 2026-09-15 (3 días después de sábado 12)
      await expect(
        service.createLog(athleteId, { weight_kg: 75.0, logged_date: '2026-09-15' })
      ).rejects.toThrow(/al menos 5 días entre pesajes/i);
    });

    it('debe indicar en el mensaje la fecha a partir de la cual podrá registrarse', async () => {
      vi.spyOn(mockBodyWeightRepo, 'findByWeek').mockResolvedValue(null);

      const previousLog: BodyWeightLogRecord = {
        ...baseRecord,
        logged_date: '2026-09-12' // Sábado
      };

      vi.spyOn(mockBodyWeightRepo, 'findAdjacentLogs').mockResolvedValue({
        previous: previousLog,
        next: null
      });

      try {
        await service.createLog(athleteId, { weight_kg: 75.0, logged_date: '2026-09-15' });
        expect.fail('Debería haber lanzado BadRequestError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestError);
        expect(err.message).toContain('2026-09-17'); // 12 + 5 = 17
      }
    });

    it('debe rechazar createLog si dista menos de 5 días del pesaje posterior adyacente (carga retroactiva)', async () => {
      vi.spyOn(mockBodyWeightRepo, 'findByWeek').mockResolvedValue(null);

      const nextLog: BodyWeightLogRecord = {
        ...baseRecord,
        logged_date: '2026-09-18'
      };

      vi.spyOn(mockBodyWeightRepo, 'findAdjacentLogs').mockResolvedValue({
        previous: null,
        next: nextLog
      });

      // Intento el 2026-09-15 (3 días antes de 18)
      await expect(
        service.createLog(athleteId, { weight_kg: 75.0, logged_date: '2026-09-15' })
      ).rejects.toThrow(/al menos 5 días entre pesajes/i);
    });

    it('debe aceptar cuando la distancia es exactamente 5 días calendario (120 h exactas)', async () => {
      vi.spyOn(mockBodyWeightRepo, 'findByWeek').mockResolvedValue(null);

      const previousLog: BodyWeightLogRecord = {
        ...baseRecord,
        logged_date: '2026-09-10'
      };

      vi.spyOn(mockBodyWeightRepo, 'findAdjacentLogs').mockResolvedValue({
        previous: previousLog,
        next: null
      });

      vi.spyOn(mockBodyWeightRepo, 'create').mockResolvedValue({
        ...baseRecord,
        id: 'new-log-id',
        logged_date: '2026-09-15'
      });
      vi.spyOn(mockBodyWeightRepo, 'findLatestBeforeDate').mockResolvedValue(baseRecord);

      const res = await service.createLog(athleteId, { weight_kg: 75.0, logged_date: '2026-09-15' });
      expect(res.logged_date).toBe('2026-09-15');
    });

    it('updateLog debe rechazar si al mover la fecha viola la guarda de 5 días con pesaje adyacente', async () => {
      vi.spyOn(mockBodyWeightRepo, 'findById').mockResolvedValue(baseRecord); // 2026-09-08

      const adjacentLog: BodyWeightLogRecord = {
        ...baseRecord,
        id: 'other-log',
        logged_date: '2026-09-03'
      };

      vi.spyOn(mockBodyWeightRepo, 'findAdjacentLogs').mockResolvedValue({
        previous: adjacentLog, // 2026-09-03 -> intenta mover a 2026-09-07 (diff = 4 días < 5)
        next: null
      });

      await expect(
        service.updateLog(athleteId, logId, { logged_date: '2026-09-07' })
      ).rejects.toThrow(/al menos 5 días entre pesajes/i);
    });
  });

  describe('5. Carga retroactiva exitosa de múltiples semanas (RF-02 CA-02.2)', () => {
    it('createBatchLogs debe ordenar ascendentemente y registrar múltiples semanas válidas', async () => {
      const inputs = [
        { weight_kg: 76.0, logged_date: '2026-09-21' }, // semana 3
        { weight_kg: 77.0, logged_date: '2026-09-07' }, // semana 1
        { weight_kg: 76.5, logged_date: '2026-09-14' }  // semana 2
      ];

      vi.spyOn(service, 'createLog').mockImplementation(async (_athId, input) => ({
        id: `log-${input.logged_date}`,
        athlete_id: athleteId,
        weight_kg: input.weight_kg,
        calendar_week_start: getCalendarWeekStart(input.logged_date),
        logged_date: input.logged_date,
        delta_kg: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const results = await service.createBatchLogs(athleteId, inputs);

      expect(results).toHaveLength(3);
      expect(results[0].logged_date).toBe('2026-09-07');
      expect(results[1].logged_date).toBe('2026-09-14');
      expect(results[2].logged_date).toBe('2026-09-21');
    });

    it('createBatchLogs debe rechazar si el lote contiene colisiones en la misma semana calendario', async () => {
      const inputs = [
        { weight_kg: 75.0, logged_date: '2026-09-08' },
        { weight_kg: 75.2, logged_date: '2026-09-11' } // misma semana (inicia 2026-09-07)
      ];

      await expect(service.createBatchLogs(athleteId, inputs))
        .rejects.toThrow(/múltiples pesajes para la misma semana calendario/i);
    });

    it('createBatchLogs debe rechazar si dos registros consecutivos en el lote distan menos de 5 días', async () => {
      const inputs = [
        { weight_kg: 75.0, logged_date: '2026-09-12' }, // Sábado semana 1
        { weight_kg: 75.2, logged_date: '2026-09-15' }  // Martes semana 2 (3 días < 5)
      ];

      await expect(service.createBatchLogs(athleteId, inputs))
        .rejects.toThrow(/al menos 5 días entre pesajes del lote/i);
    });
  });

  describe('6. Inmutabilidad de registros calisténicos pasados (RF-02 CA-02.5)', () => {
    it('al crear o editar un registro de peso, NO se debe recalcular ni modificar set_log pasados', async () => {
      const setLogSpy = vi.spyOn(setLogRepository, 'update');

      vi.spyOn(mockBodyWeightRepo, 'findById').mockResolvedValue(baseRecord);
      vi.spyOn(mockBodyWeightRepo, 'findAdjacentLogs').mockResolvedValue({ previous: null, next: null });
      vi.spyOn(mockBodyWeightRepo, 'update').mockResolvedValue({
        ...baseRecord,
        weight_kg: 78.0
      });
      vi.spyOn(mockBodyWeightRepo, 'findLatestBeforeDate').mockResolvedValue(baseRecord);
      vi.spyOn(mockAthleteRepo, 'update').mockResolvedValue({} as any);

      // El atleta edita su peso corporal
      await service.updateLog(athleteId, logId, { weight_kg: 78.0 });

      // Verificamos que no se ejecutó ninguna operación sobre set_log
      expect(setLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('7. Sincronización en perfil y resolución Carry-Forward (RF-01 CA-01.3, RF-06 CA-06.3)', () => {
    it('debe sincronizar weight_kg en el perfil del atleta cuando el registro es el más reciente', async () => {
      vi.spyOn(mockBodyWeightRepo, 'findByWeek').mockResolvedValue(null);
      vi.spyOn(mockBodyWeightRepo, 'findAdjacentLogs').mockResolvedValue({ previous: null, next: null });

      const newRecord: BodyWeightLogRecord = {
        ...baseRecord,
        id: 'latest-id',
        weight_kg: 76.5,
        logged_date: '2026-09-20'
      };

      vi.spyOn(mockBodyWeightRepo, 'create').mockResolvedValue(newRecord);
      // findLatestBeforeDate devuelve el mismo registro creado -> es el más reciente
      vi.spyOn(mockBodyWeightRepo, 'findLatestBeforeDate').mockResolvedValue(newRecord);
      const athleteUpdateSpy = vi.spyOn(mockAthleteRepo, 'update').mockResolvedValue({} as any);

      await service.createLog(athleteId, { weight_kg: 76.5, logged_date: '2026-09-20' });

      expect(athleteUpdateSpy).toHaveBeenCalledWith(athleteId, { weight_kg: 76.5 });
    });

    it('NO debe actualizar el perfil del atleta si el pesaje ingresado es retroactivo (no es el más reciente)', async () => {
      vi.spyOn(mockBodyWeightRepo, 'findByWeek').mockResolvedValue(null);
      vi.spyOn(mockBodyWeightRepo, 'findAdjacentLogs').mockResolvedValue({ previous: null, next: null });

      const retroRecord: BodyWeightLogRecord = {
        ...baseRecord,
        id: 'retro-id',
        weight_kg: 73.0,
        logged_date: '2026-08-10'
      };

      const futureLatestRecord: BodyWeightLogRecord = {
        ...baseRecord,
        id: 'future-latest',
        weight_kg: 76.0,
        logged_date: '2026-09-20'
      };

      vi.spyOn(mockBodyWeightRepo, 'create').mockResolvedValue(retroRecord);
      // El último registro conocido sigue siendo el de septiembre
      vi.spyOn(mockBodyWeightRepo, 'findLatestBeforeDate').mockResolvedValue(futureLatestRecord);
      const athleteUpdateSpy = vi.spyOn(mockAthleteRepo, 'update').mockResolvedValue({} as any);

      await service.createLog(athleteId, { weight_kg: 73.0, logged_date: '2026-08-10' });

      expect(athleteUpdateSpy).not.toHaveBeenCalled();
    });

    it('resolveCurrentWeight debe aplicar carry-forward al pesaje previo más cercano a la fecha', async () => {
      const priorLog: BodyWeightLogRecord = {
        ...baseRecord,
        weight_kg: 74.2,
        logged_date: '2026-09-08'
      };

      vi.spyOn(mockBodyWeightRepo, 'findLatestBeforeDate').mockResolvedValue(priorLog);

      const resolved = await service.resolveCurrentWeight(athleteId, '2026-09-12');
      expect(resolved).toBe(74.2);
    });

    it('resolveCurrentWeight debe recurrir al peso del perfil si no hay registros previos', async () => {
      vi.spyOn(mockBodyWeightRepo, 'findLatestBeforeDate').mockResolvedValue(null);
      vi.spyOn(mockAthleteRepo, 'findById').mockResolvedValue({
        id: athleteId,
        weight_kg: 72.5
      } as any);

      const resolved = await service.resolveCurrentWeight(athleteId, '2026-09-12');
      expect(resolved).toBe(72.5);
    });

    it('getHistory debe calcular delta_kg respecto al pesaje inmediatamente anterior', async () => {
      const records: BodyWeightLogRecord[] = [
        { ...baseRecord, id: 'log-3', weight_kg: 74.5, logged_date: '2026-09-22' },
        { ...baseRecord, id: 'log-2', weight_kg: 75.0, logged_date: '2026-09-15' },
        { ...baseRecord, id: 'log-1', weight_kg: 76.0, logged_date: '2026-09-08' }
      ];

      vi.spyOn(mockBodyWeightRepo, 'findHistoryByAthleteId').mockResolvedValue(records);

      const history = await service.getHistory(athleteId);

      expect(history).toHaveLength(3);
      // log-3: 74.5 - 75.0 = -0.5
      expect(history[0].delta_kg).toBe(-0.5);
      // log-2: 75.0 - 76.0 = -1.0
      expect(history[1].delta_kg).toBe(-1.0);
      // log-1 (más antiguo): delta null
      expect(history[2].delta_kg).toBeNull();
    });

    it('deleteLog debe eliminar el registro y sincronizar el perfil con el nuevo pesaje más reciente', async () => {
      vi.spyOn(mockBodyWeightRepo, 'findById').mockResolvedValue(baseRecord);
      const deleteSpy = vi.spyOn(mockBodyWeightRepo, 'delete').mockResolvedValue(true);

      const newLatest: BodyWeightLogRecord = {
        ...baseRecord,
        id: 'new-latest',
        weight_kg: 74.0,
        logged_date: '2026-09-01'
      };
      vi.spyOn(mockBodyWeightRepo, 'findLatestBeforeDate').mockResolvedValue(newLatest);
      const athleteUpdateSpy = vi.spyOn(mockAthleteRepo, 'update').mockResolvedValue({} as any);

      const result = await service.deleteLog(athleteId, logId);

      expect(result.success).toBe(true);
      expect(deleteSpy).toHaveBeenCalledWith(logId, athleteId);
      expect(athleteUpdateSpy).toHaveBeenCalledWith(athleteId, { weight_kg: 74.0 });
    });
  });
});
