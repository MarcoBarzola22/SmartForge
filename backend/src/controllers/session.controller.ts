import type { Request, Response, NextFunction } from 'express';
import {
  CheckinService,
  checkinService
} from '../services/checkin.service.js';
import {
  SetLoggerService,
  setLoggerService
} from '../services/set-logger.service.js';
import {
  PainReportService,
  painReportService
} from '../services/pain-report.service.js';
import {
  SessionRepository,
  sessionRepository
} from '../repositories/session.repository.js';
import {
  SetLogRepository,
  setLogRepository
} from '../repositories/set-log.repository.js';
import {
  PainReportRepository,
  painReportRepository
} from '../repositories/pain-report.repository.js';
import {
  CheckinRepository,
  checkinRepository
} from '../repositories/checkin.repository.js';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../errors/app-error.js';
import type { TrainingSession } from '../schemas/generated/schemas.js';

export class SessionController {
  constructor(
    private readonly checkinServ: CheckinService = checkinService,
    private readonly sessionRepo: SessionRepository = sessionRepository,
    private readonly setLoggerServ: SetLoggerService = setLoggerService,
    private readonly painReportServ: PainReportService = painReportService,
    private readonly setLogRepo: SetLogRepository = setLogRepository,
    private readonly painReportRepo: PainReportRepository = painReportRepository,
    private readonly checkinRepo: CheckinRepository = checkinRepository
  ) {}

  createSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado para iniciar sesión de entrenamiento.');
      }

      const { session_plan_id } = req.body;
      const session = await this.sessionRepo.create({
        athlete_id: athleteId,
        session_plan_id: String(session_plan_id)
      });

      const response: TrainingSession = {
        id: session.id,
        athlete_id: session.athlete_id,
        session_plan_id: session.session_plan_id || '',
        status: session.status,
        started_at: session.started_at,
        completed_at: session.completed_at,
        checkin: undefined,
        set_logs: [],
        pain_reports: []
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  };

  submitCheckin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const sessionId = String(req.params.id);
      const checkin = await this.checkinServ.recordCheckin(
        sessionId,
        req.body,
        athleteId
      );

      res.status(201).json(checkin);
    } catch (err) {
      next(err);
    }
  };

  logSet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const sessionId = String(req.params.id);
      const setLog = await this.setLoggerServ.logSet(sessionId, req.body, athleteId);
      res.status(201).json(setLog);
    } catch (err) {
      next(err);
    }
  };

  updateSet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const setId = String(req.params.id);
      const updatedSet = await this.setLoggerServ.updateSet(setId, req.body, athleteId);
      res.status(200).json(updatedSet);
    } catch (err) {
      next(err);
    }
  };

  deleteSet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const setId = String(req.params.id);
      await this.setLoggerServ.deleteSet(setId, athleteId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  reportPain = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const sessionId = String(req.params.id);
      const painReport = await this.painReportServ.recordPainReport(sessionId, req.body, athleteId);
      res.status(201).json(painReport);
    } catch (err) {
      next(err);
    }
  };

  completeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const sessionId = String(req.params.id);
      const session = await this.sessionRepo.findById(sessionId);
      if (!session || session.athlete_id !== athleteId) {
        throw new NotFoundError('Sesión de entrenamiento no encontrada.');
      }

      if (session.status !== 'in_progress') {
        throw new BadRequestError('La sesión ya se encuentra finalizada o cancelada.');
      }

      const updatedSession = await this.sessionRepo.updateStatus(sessionId, 'completed');
      if (!updatedSession) {
        throw new NotFoundError('Sesión de entrenamiento no encontrada.');
      }

      const checkin = await this.checkinRepo.findBySessionId(sessionId);
      const setLogs = await this.setLogRepo.findBySessionId(sessionId);
      const painReports = await this.painReportRepo.findBySessionId(sessionId);

      const response: TrainingSession = {
        id: updatedSession.id,
        athlete_id: updatedSession.athlete_id,
        session_plan_id: updatedSession.session_plan_id || '',
        status: updatedSession.status,
        started_at: updatedSession.started_at,
        completed_at: updatedSession.completed_at,
        checkin: checkin ? {
          id: checkin.id,
          session_id: checkin.session_id,
          fatigue_level: checkin.fatigue_level,
          joint_pains: checkin.joint_pains,
          created_at: checkin.created_at
        } : undefined,
        set_logs: setLogs.map((s) => ({
          id: s.id,
          session_id: s.session_id,
          exercise_id: s.exercise_id,
          set_number: s.set_number,
          reps_completed: s.reps_completed,
          weight_kg: s.weight_kg,
          rir: s.rir,
          client_timestamp: s.client_timestamp,
          created_at: s.created_at,
          updated_at: s.updated_at
        })),
        pain_reports: painReports.map((p) => ({
          id: p.id,
          session_id: p.session_id,
          exercise_id: p.exercise_id,
          joint: p.joint,
          side: p.side,
          intensity: p.intensity,
          notes: p.notes,
          created_at: p.created_at
        }))
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };
}

export const sessionController = new SessionController();
