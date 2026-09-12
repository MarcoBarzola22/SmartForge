import {
  SessionRepository,
  sessionRepository
} from '../repositories/session.repository.js';
import {
  CheckinRepository,
  checkinRepository
} from '../repositories/checkin.repository.js';
import {
  SetLogRepository,
  setLogRepository
} from '../repositories/set-log.repository.js';
import {
  PainReportRepository,
  painReportRepository
} from '../repositories/pain-report.repository.js';
import type {
  SyncRequest,
  SyncResponse
} from '../schemas/generated/schemas.js';

export class SyncService {
  constructor(
    private readonly sessionRepo: SessionRepository = sessionRepository,
    private readonly checkinRepo: CheckinRepository = checkinRepository,
    private readonly setLogRepo: SetLogRepository = setLogRepository,
    private readonly painReportRepo: PainReportRepository = painReportRepository
  ) {}

  /**
   * Resuelve el conflicto entre dos marcas de tiempo según la regla Last-Write-Wins (RNF-03, DT-10).
   * Si la marca entrante es más reciente o igual a la existente, gana la entrante ('incoming').
   * Si la existente es más reciente, gana la existente ('existing').
   */
  resolveConflictLWW(
    incomingTimestamp?: string,
    existingTimestamp?: string
  ): { winner: 'incoming' | 'existing'; incomingTime: number; existingTime: number } {
    let incomingTime = incomingTimestamp ? new Date(incomingTimestamp).getTime() : Date.now();
    if (isNaN(incomingTime)) {
      incomingTime = Date.now();
    }

    let existingTime = existingTimestamp ? new Date(existingTimestamp).getTime() : 0;
    if (isNaN(existingTime)) {
      existingTime = 0;
    }

    const winner = incomingTime >= existingTime ? 'incoming' : 'existing';
    return { winner, incomingTime, existingTime };
  }

  /**
   * Procesa y persiste un lote mixto de check-ins, series y reportes de dolor registrados offline (RNF-03, CL-10, DT-10).
   * Devuelve status 200 si todo se sincronizó de forma limpia, o 207 si ocurrieron conflictos o advertencias parciales.
   */
  async syncBatch(
    athleteId: string,
    payload: SyncRequest
  ): Promise<{ status: 200 | 207; body: SyncResponse }> {
    let processedCount = 0;
    let conflictsCount = 0;
    const errors: string[] = [];

    // Resolver sesión activa para el atleta si los items no proveen una sesión explícita
    const activeSession = await this.sessionRepo.findActiveByAthleteId(athleteId);
    const defaultSessionId = activeSession ? activeSession.id : undefined;

    // 1. Procesar check-ins
    if (payload.checkins && payload.checkins.length > 0) {
      for (const checkin of payload.checkins) {
        try {
          const targetSessionId =
            (checkin as { session_id?: string }).session_id || defaultSessionId;

          if (!targetSessionId) {
            errors.push('No hay una sesión activa para registrar el check-in.');
            continue;
          }

          const existingCheckin = await this.checkinRepo.findBySessionId(targetSessionId);
          if (existingCheckin) {
            conflictsCount++;
          } else {
            await this.checkinRepo.create({
              session_id: targetSessionId,
              fatigue_level: checkin.fatigue_level,
              joint_pains: checkin.joint_pains
            });
            processedCount++;
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Error al procesar check-in: ${msg}`);
        }
      }
    }

    // 2. Procesar series (set logs) con resolución Last-Write-Wins (DT-10)
    if (payload.sets && payload.sets.length > 0) {
      for (const set of payload.sets) {
        try {
          const targetSessionId =
            (set as { session_id?: string }).session_id || defaultSessionId;

          if (!targetSessionId) {
            errors.push(
              `No hay una sesión activa para registrar la serie ${set.set_number} de ${set.exercise_id}.`
            );
            continue;
          }

          const existingSets = await this.setLogRepo.findBySessionAndExercise(
            targetSessionId,
            set.exercise_id
          );
          const existingSet = existingSets.find((s) => s.set_number === set.set_number);

          if (existingSet) {
            conflictsCount++;
            // Resolución de conflictos basada en client_timestamp (last-write-wins, DT-10)
            const resolution = this.resolveConflictLWW(
              set.client_timestamp,
              existingSet.client_timestamp
            );

            if (resolution.winner === 'incoming') {
              await this.setLogRepo.update(existingSet.id, {
                reps_completed: set.reps_completed,
                weight_kg: set.weight_kg,
                rir: set.rir,
                client_timestamp: set.client_timestamp
              });
              processedCount++;
            }
          } else {
            await this.setLogRepo.create({
              session_id: targetSessionId,
              exercise_id: set.exercise_id,
              set_number: set.set_number,
              reps_completed: set.reps_completed,
              weight_kg: set.weight_kg,
              rir: set.rir,
              client_timestamp: set.client_timestamp
            });
            processedCount++;
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Error al procesar serie: ${msg}`);
        }
      }
    }

    // 3. Procesar reportes de molestia articular (pain reports)
    if (payload.pain_reports && payload.pain_reports.length > 0) {
      for (const report of payload.pain_reports) {
        try {
          const targetSessionId =
            (report as { session_id?: string }).session_id || defaultSessionId;

          if (!targetSessionId) {
            errors.push(
              `No hay una sesión activa para registrar el reporte de molestia de ${report.exercise_id}.`
            );
            continue;
          }

          await this.painReportRepo.create({
            session_id: targetSessionId,
            exercise_id: report.exercise_id,
            joint: report.joint,
            side: report.side,
            intensity: report.intensity,
            notes: report.notes,
            client_timestamp: (report as { client_timestamp?: string }).client_timestamp
          });
          processedCount++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Error al procesar reporte de molestia: ${msg}`);
        }
      }
    }

    const hasWarningsOrErrors = errors.length > 0 || conflictsCount > 0;
    const status: 200 | 207 = hasWarningsOrErrors ? 207 : 200;

    return {
      status,
      body: {
        processed_count: processedCount,
        conflicts_count: conflictsCount,
        errors: errors.length > 0 ? errors : undefined,
        synced_at: new Date().toISOString()
      }
    };
  }
}

export const syncService = new SyncService();
