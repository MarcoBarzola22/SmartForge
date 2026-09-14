import {
  BodyWeightRepository,
  bodyWeightRepository,
  type BodyWeightLogRecord
} from '../repositories/body-weight.repository.js';
import {
  AthleteRepository,
  athleteRepository
} from '../repositories/athlete.repository.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError
} from '../errors/app-error.js';
import type { WeightLogItem } from '../schemas/generated/schemas.js';

/**
 * Calcula la fecha (YYYY-MM-DD) del lunes inicial de la semana calendario para una fecha dada en UTC.
 */
export function getCalendarWeekStart(dateStr: string): string {
  const parts = dateStr.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  date.setUTCDate(date.getUTCDate() + diffToMonday);
  return date.toISOString().slice(0, 10);
}

/**
 * Calcula la diferencia en días calendario entre dos fechas (date2 - date1).
 */
export function getCalendarDaysDiff(dateStr1: string, dateStr2: string): number {
  const p1 = dateStr1.split('-');
  const y1 = Number(p1[0]);
  const m1 = Number(p1[1]);
  const d1 = Number(p1[2]);

  const p2 = dateStr2.split('-');
  const y2 = Number(p2[0]);
  const m2 = Number(p2[1]);
  const d2 = Number(p2[2]);

  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((utc2 - utc1) / MS_PER_DAY);
}

/**
 * Suma una cantidad de días a una fecha calendario YYYY-MM-DD.
 */
export function addCalendarDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);

  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export interface CreateBodyWeightInput {
  weight_kg: number;
  logged_date: string;
}

export interface UpdateBodyWeightInput {
  weight_kg?: number;
  logged_date?: string;
}

export class BodyWeightService {
  constructor(
    private readonly bodyWeightRepo: BodyWeightRepository = bodyWeightRepository,
    private readonly athleteRepo: AthleteRepository = athleteRepository
  ) {}

  private validateWeightValue(weightKg: number): number {
    if (typeof weightKg !== 'number' || isNaN(weightKg) || weightKg < 30.0 || weightKg > 300.0) {
      throw new BadRequestError('El peso corporal debe estar entre 30.0 kg y 300.0 kg.');
    }
    return Math.round(weightKg * 10) / 10;
  }

  private validateDateFormat(dateStr: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestError('Fecha inválida. Formato esperado: AAAA-MM-DD.');
    }
    const parts = dateStr.split('-');
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);

    const date = new Date(Date.UTC(y, m - 1, d));
    if (
      date.getUTCFullYear() !== y ||
      date.getUTCMonth() + 1 !== m ||
      date.getUTCDate() !== d
    ) {
      throw new BadRequestError('Fecha inválida en el calendario.');
    }
  }

  private mapRecordToItem(record: BodyWeightLogRecord, deltaKg: number | null = null): WeightLogItem {
    return {
      id: record.id,
      athlete_id: record.athlete_id,
      weight_kg: record.weight_kg,
      calendar_week_start: record.calendar_week_start,
      logged_date: record.logged_date,
      delta_kg: deltaKg,
      created_at: record.logged_at_utc,
      updated_at: record.updated_at_utc
    };
  }

  /**
   * Registra un pesaje semanal de peso corporal.
   * Valida rango (30–300 kg), unicidad de semana calendario y guarda de 120 horas (5 días) con pesajes adyacentes.
   * Si es el pesaje más reciente, actualiza el perfil del atleta (RF-01, CA-01.3, CA-01.4).
   */
  async createLog(athleteId: string, input: CreateBodyWeightInput): Promise<WeightLogItem> {
    const roundedWeight = this.validateWeightValue(input.weight_kg);
    this.validateDateFormat(input.logged_date);

    const calendarWeekStart = getCalendarWeekStart(input.logged_date);

    // 1. Validar que no exista registro previo en la misma semana calendario (CA-01.4 #1)
    const existingWeekLog = await this.bodyWeightRepo.findByWeek(athleteId, calendarWeekStart);
    if (existingWeekLog) {
      throw new ConflictError(
        `Ya existe un pesaje registrado para la semana del ${calendarWeekStart}. Puedes editar el registro existente.`
      );
    }

    // 2. Validar guarda de 120 horas (5 días) con registros adyacentes (CA-01.2, CA-01.4 #2)
    const { previous, next } = await this.bodyWeightRepo.findAdjacentLogs(athleteId, input.logged_date);

    if (previous) {
      const diffDays = getCalendarDaysDiff(previous.logged_date, input.logged_date);
      if (diffDays < 5) {
        const eligibleDate = addCalendarDays(previous.logged_date, 5);
        throw new BadRequestError(
          `Para garantizar la consistencia de tu tendencia, debe existir un intervalo de al menos 5 días entre pesajes. Podrás registrar tu nuevo peso a partir de ${eligibleDate}.`
        );
      }
    }

    if (next) {
      const diffDays = getCalendarDaysDiff(input.logged_date, next.logged_date);
      if (diffDays < 5) {
        throw new BadRequestError(
          'Para garantizar la consistencia de tu tendencia, debe existir un intervalo de al menos 5 días entre pesajes.'
        );
      }
    }

    // 3. Crear registro en BD
    const record = await this.bodyWeightRepo.create({
      athlete_id: athleteId,
      weight_kg: roundedWeight,
      calendar_week_start: calendarWeekStart,
      logged_date: input.logged_date
    });

    // 4. Sincronizar peso en perfil del atleta solo si es el pesaje más reciente (CA-01.3)
    const latestRecord = await this.bodyWeightRepo.findLatestBeforeDate(athleteId, '9999-12-31');
    if (latestRecord && latestRecord.id === record.id) {
      await this.athleteRepo.update(athleteId, { weight_kg: roundedWeight });
    }

    return this.mapRecordToItem(record, null);
  }

  /**
   * Actualiza el peso o fecha de un registro existente de un atleta dentro de la misma semana calendario (RF-02 CA-02.4).
   * La inmutabilidad de los 1RM de entrenamientos pasados queda resguardada (CA-02.5).
   */
  async updateLog(
    athleteId: string,
    logId: string,
    input: UpdateBodyWeightInput
  ): Promise<WeightLogItem> {
    const existing = await this.bodyWeightRepo.findById(logId, athleteId);
    if (!existing) {
      throw new NotFoundError('Registro de pesaje no encontrado.');
    }

    let roundedWeight: number | undefined;
    if (input.weight_kg !== undefined) {
      roundedWeight = this.validateWeightValue(input.weight_kg);
    }

    let targetDate = existing.logged_date;
    if (input.logged_date !== undefined) {
      this.validateDateFormat(input.logged_date);
      const newWeekStart = getCalendarWeekStart(input.logged_date);
      if (newWeekStart !== existing.calendar_week_start) {
        throw new BadRequestError(
          'La fecha modificada debe permanecer dentro de la misma semana calendario.'
        );
      }
      targetDate = input.logged_date;

      // Validar guarda de 120 horas excluyendo el registro actual
      const { previous, next } = await this.bodyWeightRepo.findAdjacentLogs(
        athleteId,
        targetDate,
        logId
      );

      if (previous && getCalendarDaysDiff(previous.logged_date, targetDate) < 5) {
        throw new BadRequestError(
          'Para garantizar la consistencia de tu tendencia, debe existir un intervalo de al menos 5 días entre pesajes.'
        );
      }

      if (next && getCalendarDaysDiff(targetDate, next.logged_date) < 5) {
        throw new BadRequestError(
          'Para garantizar la consistencia de tu tendencia, debe existir un intervalo de al menos 5 días entre pesajes.'
        );
      }
    }

    const updated = await this.bodyWeightRepo.update(logId, athleteId, {
      weight_kg: roundedWeight,
      logged_date: targetDate,
      calendar_week_start: existing.calendar_week_start
    });

    if (!updated) {
      throw new NotFoundError('Registro de pesaje no encontrado.');
    }

    // Actualizar referencia en perfil si este registro resulta ser el más reciente
    const latestRecord = await this.bodyWeightRepo.findLatestBeforeDate(athleteId, '9999-12-31');
    if (latestRecord && latestRecord.id === updated.id && roundedWeight !== undefined) {
      await this.athleteRepo.update(athleteId, { weight_kg: roundedWeight });
    }

    return this.mapRecordToItem(updated, null);
  }

  /**
   * Permite ingresar múltiples pesajes retroactivos pendientes en lote (RF-02 CA-02.2).
   */
  async createBatchLogs(
    athleteId: string,
    inputs: CreateBodyWeightInput[]
  ): Promise<WeightLogItem[]> {
    if (!inputs || inputs.length === 0) {
      return [];
    }

    // Ordenar cronológicamente ascendente
    const sorted = [...inputs].sort((a, b) => a.logged_date.localeCompare(b.logged_date));

    // Validar unicidad de semana calendario y distancia de 120h dentro del propio lote
    const seenWeeks = new Set<string>();
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      if (!current) continue;

      this.validateWeightValue(current.weight_kg);
      this.validateDateFormat(current.logged_date);
      const weekStart = getCalendarWeekStart(current.logged_date);

      if (seenWeeks.has(weekStart)) {
        throw new BadRequestError('El lote contiene múltiples pesajes para la misma semana calendario.');
      }
      seenWeeks.add(weekStart);

      if (i > 0) {
        const previous = sorted[i - 1];
        if (previous) {
          const diff = getCalendarDaysDiff(previous.logged_date, current.logged_date);
          if (diff < 5) {
            throw new BadRequestError(
              'Para garantizar la consistencia de tu tendencia, debe existir un intervalo de al menos 5 días entre pesajes del lote.'
            );
          }
        }
      }
    }

    const results: WeightLogItem[] = [];
    for (const item of sorted) {
      const created = await this.createLog(athleteId, item);
      results.push(created);
    }

    return results;
  }

  /**
   * Obtiene el historial cronológico descendente con el delta en kg respecto al pesaje inmediatamente anterior (RF-02 CA-02.1).
   */
  async getHistory(athleteId: string): Promise<WeightLogItem[]> {
    const records = await this.bodyWeightRepo.findHistoryByAthleteId(athleteId);

    return records.map((record, index) => {
      let deltaKg: number | null = null;
      if (index < records.length - 1) {
        const previousRecord = records[index + 1];
        if (previousRecord) {
          deltaKg = Math.round((record.weight_kg - previousRecord.weight_kg) * 10) / 10;
        }
      }
      return this.mapRecordToItem(record, deltaKg);
    });
  }

  /**
   * Resuelve el peso corporal vigente aplicando la regla de arrastre del último pesaje conocido (carry-forward)
   * a la fecha indicada (RF-06 CA-06.3). Si no hay registros previos, recurre al peso del perfil del atleta.
   */
  async resolveCurrentWeight(athleteId: string, sessionDate: string): Promise<number> {
    const latestLog = await this.bodyWeightRepo.findLatestBeforeDate(athleteId, sessionDate);
    if (latestLog) {
      return latestLog.weight_kg;
    }

    const athlete = await this.athleteRepo.findById(athleteId);
    if (!athlete) {
      throw new NotFoundError('Perfil de atleta no encontrado.');
    }

    return athlete.weight_kg;
  }

  /**
   * Elimina un registro de pesaje y actualiza el peso de referencia en el perfil si correspondía al más reciente.
   */
  async deleteLog(athleteId: string, logId: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.bodyWeightRepo.findById(logId, athleteId);
    if (!existing) {
      throw new NotFoundError('Registro de pesaje no encontrado.');
    }

    await this.bodyWeightRepo.delete(logId, athleteId);

    const latest = await this.bodyWeightRepo.findLatestBeforeDate(athleteId, '9999-12-31');
    if (latest) {
      await this.athleteRepo.update(athleteId, { weight_kg: latest.weight_kg });
    }

    return {
      success: true,
      message: 'Registro de pesaje eliminado exitosamente.'
    };
  }
}

export const bodyWeightService = new BodyWeightService();
