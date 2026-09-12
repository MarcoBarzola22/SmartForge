import {
  CheckinRepository,
  checkinRepository
} from '../repositories/checkin.repository.js';
import {
  SessionRepository,
  sessionRepository
} from '../repositories/session.repository.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError
} from '../errors/app-error.js';
import {
  CheckInRequestSchema,
  type CheckInRequest,
  type CheckInResponse
} from '../schemas/generated/schemas.js';

export class CheckinService {
  constructor(
    private readonly checkinRepo: CheckinRepository = checkinRepository,
    private readonly sessionRepo: SessionRepository = sessionRepository
  ) {}

  /**
   * Registra el check-in previo a la sesión de entrenamiento con escala de fatiga (1-5)
   * y articulaciones bilaterales con intensidad (RF-04, CA-04.1, CA-04.2, CA-04.3, CA-04.4).
   */
  async recordCheckin(
    sessionId: string,
    data: CheckInRequest,
    athleteId?: string,
    clientTimestamp?: string
  ): Promise<CheckInResponse> {
    const parseResult = CheckInRequestSchema.safeParse(data);
    if (!parseResult.success) {
      const issues = parseResult.error.errors.map((e) => e.message).join(', ');
      throw new BadRequestError(`Datos de check-in inválidos: ${issues}`);
    }

    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Sesión de entrenamiento no encontrada.');
    }

    if (athleteId && session.athlete_id !== athleteId) {
      throw new NotFoundError('Sesión de entrenamiento no encontrada.');
    }

    if (session.status !== 'in_progress') {
      throw new BadRequestError('No se puede registrar check-in en una sesión que no está en progreso.');
    }

    const existing = await this.checkinRepo.findBySessionId(sessionId);
    if (existing) {
      throw new ConflictError('La sesión ya cuenta con un check-in registrado.');
    }

    const checkin = await this.checkinRepo.create({
      session_id: sessionId,
      fatigue_level: parseResult.data.fatigue_level,
      joint_pains: parseResult.data.joint_pains,
      client_timestamp: clientTimestamp
    });

    return {
      id: checkin.id,
      session_id: checkin.session_id,
      fatigue_level: checkin.fatigue_level,
      joint_pains: checkin.joint_pains,
      created_at: checkin.created_at
    };
  }

  /**
   * Obtiene el check-in registrado para una sesión específica.
   */
  async getCheckinBySessionId(
    sessionId: string,
    athleteId?: string
  ): Promise<CheckInResponse> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Sesión de entrenamiento no encontrada.');
    }

    if (athleteId && session.athlete_id !== athleteId) {
      throw new NotFoundError('Sesión de entrenamiento no encontrada.');
    }

    const checkin = await this.checkinRepo.findBySessionId(sessionId);
    if (!checkin) {
      throw new NotFoundError('Check-in no encontrado para esta sesión.');
    }

    return {
      id: checkin.id,
      session_id: checkin.session_id,
      fatigue_level: checkin.fatigue_level,
      joint_pains: checkin.joint_pains,
      created_at: checkin.created_at
    };
  }

  /**
   * Obtiene un check-in por su ID propio.
   */
  async getCheckinById(
    checkinId: string,
    athleteId?: string
  ): Promise<CheckInResponse> {
    const checkin = await this.checkinRepo.findById(checkinId);
    if (!checkin) {
      throw new NotFoundError('Check-in no encontrado.');
    }

    if (athleteId) {
      const session = await this.sessionRepo.findById(checkin.session_id);
      if (!session || session.athlete_id !== athleteId) {
        throw new NotFoundError('Check-in no encontrado.');
      }
    }

    return {
      id: checkin.id,
      session_id: checkin.session_id,
      fatigue_level: checkin.fatigue_level,
      joint_pains: checkin.joint_pains,
      created_at: checkin.created_at
    };
  }
}

export const checkinService = new CheckinService();
