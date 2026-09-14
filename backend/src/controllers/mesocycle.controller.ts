import type { Request, Response, NextFunction } from 'express';
import {
  MesocycleGeneratorService,
  mesocycleGeneratorService
} from '../services/mesocycle-generator.service.js';
import {
  MesocycleRotationService,
  mesocycleRotationService
} from '../services/mesocycle-rotation.service.js';
import {
  MesocycleLifecycleService,
  mesocycleLifecycleService
} from '../services/mesocycle-lifecycle.service.js';
import {
  MesocycleHistoryService,
  mesocycleHistoryService
} from '../services/mesocycle-history.service.js';
import {
  BaselineSnapshotService,
  baselineSnapshotService
} from '../services/baseline-snapshot.service.js';
import {
  RoutineEngineV2Service,
  routineEngineV2Service
} from '../services/routine-engine-v2.service.js';
import {
  MesocycleRepository,
  mesocycleRepository
} from '../repositories/mesocycle.repository.js';
import { UnauthorizedError, BadRequestError } from '../errors/app-error.js';

export class MesocycleController {
  constructor(
    private readonly service: MesocycleGeneratorService = mesocycleGeneratorService,
    private readonly rotationService: MesocycleRotationService = mesocycleRotationService,
    private readonly lifecycleService: MesocycleLifecycleService = mesocycleLifecycleService,
    private readonly historyService: MesocycleHistoryService = mesocycleHistoryService,
    private readonly snapshotService: BaselineSnapshotService = baselineSnapshotService,
    private readonly engineV2Service: RoutineEngineV2Service = routineEngineV2Service,
    private readonly mesocycleRepo: MesocycleRepository = mesocycleRepository
  ) {}

  generate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado para generar un mesociclo.');
      }

      const body = req.body;

      // Validación pedagógica de viabilidad temporal en V2 (RF-04 CA-04.2, CA-04.3)
      if (body?.sessionDurationMinutes && body?.exercisesPerSessionPreference) {
        const pref = body.exercisesPerSessionPreference;
        if (pref.mode === 'manual' && typeof pref.customCount === 'number') {
          const feasibility = this.engineV2Service.validateSelectionFeasibility(
            body.sessionDurationMinutes,
            pref.customCount
          );
          if (!feasibility.isFeasible) {
            throw new BadRequestError(
              `${feasibility.reason} ${feasibility.suggestion || ''}`.trim()
            );
          }
        }
      }

      const mesocycle = await this.rotationService.rotateAndPersistForAthlete(
        athleteId,
        body
      );

      // Captura inmutable de snapshots basales de punto de partida (RF-05 CA-05.1)
      const exerciseIds: string[] = [];
      if (mesocycle.weeks) {
        for (const week of mesocycle.weeks) {
          if (week.sessions) {
            for (const session of week.sessions) {
              if (session.exercise_assignments) {
                for (const assignment of session.exercise_assignments) {
                  if (assignment.exercise_id) {
                    exerciseIds.push(assignment.exercise_id);
                  }
                }
              }
            }
          }
        }
      }

      if (exerciseIds.length > 0) {
        try {
          await this.snapshotService.captureBaselinesForMesocycle({
            mesocycleId: mesocycle.id,
            athleteId,
            exerciseIds
          });
        } catch {
          // No interrumpir la respuesta si los snapshots ya fueron generados
        }
      }

      res.status(201).json(mesocycle);
    } catch (err) {
      next(err);
    }
  };

  getCurrent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const mesocycle = await this.service.getCurrentMesocycle(athleteId);
      res.status(200).json(mesocycle);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const mesocycle = await this.service.getMesocycleById(athleteId, String(req.params.id));
      res.status(200).json(mesocycle);
    } catch (err) {
      next(err);
    }
  };

  cancelActive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado para cancelar mesociclo.');
      }

      const reason = req.body?.reason;
      const result = await this.lifecycleService.cancelActiveMesocycle(athleteId, {
        reason,
        cancelledAt: new Date().toISOString()
      });

      let message = 'Mesociclo cancelado exitosamente. Sesiones guardadas en historial.';
      if (result.wasAlreadyCompleted || result.status === 'completed') {
        message = 'El mesociclo ya se encontraba completado; se preserva su estado.';
      } else if (result.status === 'deload_skipped') {
        message = 'Mesociclo finalizado durante la descarga. Guardado como completado (descarga omitida).';
      }

      res.status(200).json({
        status: result.status,
        message,
        cancelled_at:
          result.status === 'cancelled' || result.status === 'deload_skipped'
            ? new Date().toISOString()
            : null
      });
    } catch (err) {
      next(err);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const history = await this.historyService.getAthleteHistory(athleteId);
      res.status(200).json(history.mesocycles);
    } catch (err) {
      next(err);
    }
  };

  getAvailabilityWarning = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const activeMeso = await this.mesocycleRepo.findActiveByAthleteId(athleteId);
      if (activeMeso) {
        res.status(200).json({
          hasActiveMesocycle: true,
          mesocycleId: activeMeso.id,
          warning:
            'Una rutina en curso no admite modificaciones estructurales globales de disponibilidad. Te recomendamos cancelar el mesociclo actual y generar uno nuevo con tus nuevos parámetros.',
          recommendation: 'cancel_and_recreate'
        });
        return;
      }

      res.status(200).json({
        hasActiveMesocycle: false,
        warning: null,
        recommendation: null
      });
    } catch (err) {
      next(err);
    }
  };

  updateAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const athleteId = req.athlete?.id;
      if (!athleteId) {
        throw new UnauthorizedError('No autorizado.');
      }

      const activeMeso = await this.mesocycleRepo.findActiveByAthleteId(athleteId);
      if (activeMeso) {
        res.status(400).json({
          code: 'ACTIVE_MESOCYCLE_IMMUTABLE',
          message:
            'Una rutina en curso no admite modificaciones estructurales globales de disponibilidad. Para cambiar tus días o tiempos de entrenamiento, debes cancelar el ciclo actual y generar uno nuevo.',
          recommendation: 'cancel_and_recreate',
          activeMesocycleId: activeMeso.id
        });
        return;
      }

      res.status(200).json({
        message: 'Disponibilidad actualizada exitosamente.'
      });
    } catch (err) {
      next(err);
    }
  };
}

export const mesocycleController = new MesocycleController();
