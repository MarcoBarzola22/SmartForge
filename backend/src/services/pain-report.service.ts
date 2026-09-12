import {
  PainReportRepository,
  painReportRepository,
  type PainReportRecord
} from '../repositories/pain-report.repository.js';
import {
  SessionRepository,
  sessionRepository
} from '../repositories/session.repository.js';
import {
  BadRequestError,
  NotFoundError
} from '../errors/app-error.js';
import {
  CreatePainReportRequestSchema,
  type CreatePainReportRequest,
  type PainReport,
  type Joint
} from '../schemas/generated/schemas.js';

export class PainReportService {
  constructor(
    private readonly painReportRepo: PainReportRepository = painReportRepository,
    private readonly sessionRepo: SessionRepository = sessionRepository
  ) {}

  private mapToPainReport(record: PainReportRecord): PainReport {
    return {
      id: record.id,
      session_id: record.session_id,
      exercise_id: record.exercise_id,
      joint: record.joint,
      side: record.side,
      intensity: record.intensity,
      notes: record.notes,
      created_at: record.created_at
    };
  }

  /**
   * Registra un reporte opcional de molestia articular post-ejercicio (RF-06, CA-06.1, CA-06.2, CA-06.3).
   */
  async recordPainReport(
    sessionId: string,
    data: CreatePainReportRequest,
    athleteId?: string,
    clientTimestamp?: string
  ): Promise<PainReport> {
    const parseResult = CreatePainReportRequestSchema.safeParse(data);
    if (!parseResult.success) {
      const issues = parseResult.error.errors.map((e) => e.message).join(', ');
      throw new BadRequestError(`Datos de reporte de molestia inválidos: ${issues}`);
    }

    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Sesión de entrenamiento no encontrada.');
    }

    if (athleteId && session.athlete_id !== athleteId) {
      throw new NotFoundError('Sesión de entrenamiento no encontrada.');
    }

    if (session.status !== 'in_progress') {
      throw new BadRequestError('No se puede registrar reporte de molestia en una sesión finalizada o cancelada.');
    }

    const record = await this.painReportRepo.create({
      session_id: sessionId,
      exercise_id: parseResult.data.exercise_id,
      joint: parseResult.data.joint,
      side: parseResult.data.side,
      intensity: parseResult.data.intensity,
      notes: parseResult.data.notes,
      client_timestamp: clientTimestamp
    });

    return this.mapToPainReport(record);
  }

  /**
   * Obtiene todos los reportes de molestia registrados en una sesión de entrenamiento.
   */
  async getPainReportsBySession(sessionId: string, athleteId?: string): Promise<PainReport[]> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Sesión de entrenamiento no encontrada.');
    }

    if (athleteId && session.athlete_id !== athleteId) {
      throw new NotFoundError('Sesión de entrenamiento no encontrada.');
    }

    const records = await this.painReportRepo.findBySessionId(sessionId);
    return records.map((r) => this.mapToPainReport(r));
  }

  /**
   * Obtiene los reportes de molestia de un ejercicio específico en una sesión.
   */
  async getPainReportsByExercise(
    sessionId: string,
    exerciseId: string,
    athleteId?: string
  ): Promise<PainReport[]> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Sesión de entrenamiento no encontrada.');
    }

    if (athleteId && session.athlete_id !== athleteId) {
      throw new NotFoundError('Sesión de entrenamiento no encontrada.');
    }

    const records = await this.painReportRepo.findBySessionAndExercise(sessionId, exerciseId);
    return records.map((r) => this.mapToPainReport(r));
  }

  /**
   * Obtiene el historial de molestias de una articulación para el atleta (para motor de ajustes de RF-08).
   */
  async getAthleteJointPainHistory(
    athleteId: string,
    joint: Joint,
    limit = 10
  ): Promise<PainReport[]> {
    const records = await this.painReportRepo.findByAthleteAndJoint(athleteId, joint, limit);
    return records.map((r) => this.mapToPainReport(r));
  }
}

export const painReportService = new PainReportService();
