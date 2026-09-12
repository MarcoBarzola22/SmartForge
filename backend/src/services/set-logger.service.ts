import {
  SetLogRepository,
  setLogRepository,
  type SetLogRecord
} from '../repositories/set-log.repository.js';
import {
  SessionRepository,
  sessionRepository
} from '../repositories/session.repository.js';
import {
  BadRequestError,
  NotFoundError
} from '../errors/app-error.js';
import {
  CreateSetLogRequestSchema,
  UpdateSetLogRequestSchema,
  type CreateSetLogRequest,
  type UpdateSetLogRequest,
  type SetLog
} from '../schemas/generated/schemas.js';

export class SetLoggerService {
  constructor(
    private readonly setLogRepo: SetLogRepository = setLogRepository,
    private readonly sessionRepo: SessionRepository = sessionRepository
  ) {}

  private mapToSetLog(record: SetLogRecord): SetLog {
    return {
      id: record.id,
      session_id: record.session_id,
      exercise_id: record.exercise_id,
      set_number: record.set_number,
      reps_completed: record.reps_completed,
      weight_kg: record.weight_kg,
      rir: record.rir,
      client_timestamp: record.client_timestamp,
      created_at: record.created_at,
      updated_at: record.updated_at
    };
  }

  /**
   * Registra una serie completada con validación de RIR (0-5), peso (>=0 kg) y sesión activa (RF-05, CL-05).
   */
  async logSet(
    sessionId: string,
    data: CreateSetLogRequest,
    athleteId?: string
  ): Promise<SetLog> {
    const parseResult = CreateSetLogRequestSchema.safeParse(data);
    if (!parseResult.success) {
      const issues = parseResult.error.errors.map((e) => e.message).join(', ');
      throw new BadRequestError(`Datos de serie inválidos: ${issues}`);
    }

    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Sesión de entrenamiento no encontrada.');
    }

    if (athleteId && session.athlete_id !== athleteId) {
      throw new NotFoundError('Sesión de entrenamiento no encontrada.');
    }

    if (session.status !== 'in_progress') {
      throw new BadRequestError('No se pueden registrar series en una sesión finalizada o cancelada.');
    }

    const setRecord = await this.setLogRepo.create({
      session_id: sessionId,
      exercise_id: parseResult.data.exercise_id,
      set_number: parseResult.data.set_number,
      reps_completed: parseResult.data.reps_completed,
      weight_kg: parseResult.data.weight_kg,
      rir: parseResult.data.rir,
      client_timestamp: parseResult.data.client_timestamp
    });

    return this.mapToSetLog(setRecord);
  }

  /**
   * Actualiza una serie ya registrada dentro de una sesión activa (RF-05, CA-05.4, CL-05).
   */
  async updateSet(
    setId: string,
    data: UpdateSetLogRequest,
    athleteId?: string
  ): Promise<SetLog> {
    const parseResult = UpdateSetLogRequestSchema.safeParse(data);
    if (!parseResult.success) {
      const issues = parseResult.error.errors.map((e) => e.message).join(', ');
      throw new BadRequestError(`Datos de actualización inválidos: ${issues}`);
    }

    const existingSet = await this.setLogRepo.findById(setId);
    if (!existingSet) {
      throw new NotFoundError('Serie no encontrada.');
    }

    const session = await this.sessionRepo.findById(existingSet.session_id);
    if (!session) {
      throw new NotFoundError('Sesión de entrenamiento no encontrada.');
    }

    if (athleteId && session.athlete_id !== athleteId) {
      throw new NotFoundError('Serie no encontrada.');
    }

    if (session.status !== 'in_progress') {
      throw new BadRequestError('No se pueden modificar series en una sesión finalizada o cancelada.');
    }

    const updatedRecord = await this.setLogRepo.update(setId, {
      reps_completed: parseResult.data.reps_completed,
      weight_kg: parseResult.data.weight_kg,
      rir: parseResult.data.rir,
      client_timestamp: parseResult.data.client_timestamp
    });

    if (!updatedRecord) {
      throw new NotFoundError('Serie no encontrada.');
    }

    return this.mapToSetLog(updatedRecord);
  }

  /**
   * Elimina una serie ya registrada dentro de una sesión activa (RF-05, CA-05.4).
   */
  async deleteSet(setId: string, athleteId?: string): Promise<boolean> {
    const existingSet = await this.setLogRepo.findById(setId);
    if (!existingSet) {
      throw new NotFoundError('Serie no encontrada.');
    }

    const session = await this.sessionRepo.findById(existingSet.session_id);
    if (!session) {
      throw new NotFoundError('Sesión de entrenamiento no encontrada.');
    }

    if (athleteId && session.athlete_id !== athleteId) {
      throw new NotFoundError('Serie no encontrada.');
    }

    if (session.status !== 'in_progress') {
      throw new BadRequestError('No se pueden eliminar series en una sesión finalizada o cancelada.');
    }

    return await this.setLogRepo.delete(setId);
  }

  /**
   * Obtiene todas las series registradas en una sesión.
   */
  async getSetsBySession(sessionId: string, athleteId?: string): Promise<SetLog[]> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Sesión de entrenamiento no encontrada.');
    }

    if (athleteId && session.athlete_id !== athleteId) {
      throw new NotFoundError('Sesión de entrenamiento no encontrada.');
    }

    const records = await this.setLogRepo.findBySessionId(sessionId);
    return records.map((r) => this.mapToSetLog(r));
  }
}

export const setLoggerService = new SetLoggerService();
