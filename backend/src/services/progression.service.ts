import type {
  ExperienceLevel,
  ProgressionAction,
  ProgressionSuggestion,
  Exercise
} from '../schemas/generated/schemas.js';
import {
  MesocycleRepository,
  mesocycleRepository
} from '../repositories/mesocycle.repository.js';
import {
  AthleteRepository,
  athleteRepository
} from '../repositories/athlete.repository.js';
import {
  SetLogRepository,
  setLogRepository
} from '../repositories/set-log.repository.js';
import {
  PainReportRepository,
  painReportRepository
} from '../repositories/pain-report.repository.js';
import {
  FatigueAdjusterService,
  fatigueAdjusterService,
  type JointPainReportItem,
  type ExerciseSummary
} from './fatigue-adjuster.service.js';
import { NotFoundError } from '../errors/app-error.js';

export interface SetPerformance {
  set_number?: number;
  reps_completed: number;
  weight_kg?: number;
  rir: number;
}

export interface SessionPerformance {
  sessionId?: string;
  date?: string | Date;
  sets: SetPerformance[];
}

export interface PerformanceWindowAnalysis {
  successfulStreak: number;
  consecutiveFailures: number;
  totalFailuresInWindow: number;
  evaluatedSessions: number;
}

export interface CalculateProgressionParams {
  experienceLevel: ExperienceLevel;
  isCompound: boolean;
  currentLoadKg: number;
  currentRepsTarget: number;
  sessionHistory: SessionPerformance[];
  targetReps?: number;
  targetRir?: number;
  repsTargetMin?: number;
  repsTargetMax?: number;
  isIncrementViable?: boolean;
  daysSinceLastSession?: number;
  exercise?: Exercise | ExerciseSummary;
  painReports?: JointPainReportItem[];
}

export interface ProgressionEvaluationResult {
  action: ProgressionAction;
  next_load_kg: number;
  next_reps_target: number;
  reason: string;
  streak_count: number;
  window_sessions: number;
}

export class ProgressionService {
  constructor(
    private readonly mesocycleRepo: MesocycleRepository = mesocycleRepository,
    private readonly athleteRepo: AthleteRepository = athleteRepository,
    private readonly setLogRepo: SetLogRepository = setLogRepository,
    private readonly painReportRepo: PainReportRepository = painReportRepository,
    private readonly fatigueAdjuster: FatigueAdjusterService = fatigueAdjusterService
  ) {}

  /**
   * Determina el número de sesiones exitosas requeridas para subir carga según el nivel del atleta (RF-07, CA-07.1).
   */
  getRequiredSessionsForProgression(experienceLevel: ExperienceLevel): number {
    switch (experienceLevel) {
      case 'principiante':
        return 1;
      case 'intermedio':
        return 2;
      case 'avanzado':
        return 3;
    }
  }

  /**
   * Obtiene el incremento exacto de carga en kg según el nivel y si el ejercicio es compuesto o monoarticular (RF-07, CA-07.1).
   */
  getLoadIncrement(experienceLevel: ExperienceLevel, isCompound: boolean): number {
    switch (experienceLevel) {
      case 'principiante':
        return isCompound ? 5.0 : 2.5;
      case 'intermedio':
        return isCompound ? 2.5 : 1.25;
      case 'avanzado':
        return isCompound ? 2.5 : 1.25;
    }
  }

  /**
   * Determina si una sesión fue exitosa para un ejercicio específico (RF-07, CA-07.1).
   * Criterio: todas las series completadas alcanzaron las repeticiones objetivo con RIR >= RIR objetivo (default 2).
   */
  isSessionSuccessful(
    sets: SetPerformance[],
    targetReps: number,
    targetRir = 2
  ): boolean {
    if (!sets || sets.length === 0) {
      return false;
    }

    return sets.every(
      (set) => set.reps_completed >= targetReps && set.rir >= targetRir
    );
  }

  /**
   * Calcula la racha de sesiones consecutivas exitosas desde la más reciente (RF-07, CA-07.1, CA-07.4).
   * La racha se detiene en el primer fallo.
   */
  calculateStreak(
    sessions: SessionPerformance[],
    targetReps: number,
    targetRir = 2,
    windowSize = 3
  ): number {
    if (!sessions || sessions.length === 0) {
      return 0;
    }

    let streak = 0;
    const windowSessions = sessions.slice(0, windowSize);

    for (const session of windowSessions) {
      if (this.isSessionSuccessful(session.sets, targetReps, targetRir)) {
        streak += 1;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Analiza la ventana de desempeño de un ejercicio para calcular rachas de éxito y fallos acumulados (RF-07, CA-07.2).
   */
  analyzePerformanceWindow(
    sessions: SessionPerformance[],
    targetReps: number,
    targetRir = 2,
    windowSize = 3
  ): PerformanceWindowAnalysis {
    if (!sessions || sessions.length === 0) {
      return {
        successfulStreak: 0,
        consecutiveFailures: 0,
        totalFailuresInWindow: 0,
        evaluatedSessions: 0
      };
    }

    const windowSessions = sessions.slice(0, windowSize);
    const successfulStreak = this.calculateStreak(windowSessions, targetReps, targetRir, windowSize);

    let consecutiveFailures = 0;
    for (const session of windowSessions) {
      if (!this.isSessionSuccessful(session.sets, targetReps, targetRir)) {
        consecutiveFailures += 1;
      } else {
        break;
      }
    }

    let totalFailuresInWindow = 0;
    for (const session of windowSessions) {
      if (!this.isSessionSuccessful(session.sets, targetReps, targetRir)) {
        totalFailuresInWindow += 1;
      }
    }

    return {
      successfulStreak,
      consecutiveFailures,
      totalFailuresInWindow,
      evaluatedSessions: windowSessions.length
    };
  }

  /**
   * Evalúa la sobrecarga progresiva, fallos acumulados, inactividad y doble progresión (RF-07, CA-07.1, CA-07.2, CA-07.3, CA-07.5, CL-08).
   */
  evaluateProgression(params: CalculateProgressionParams): ProgressionEvaluationResult {
    const targetReps = params.targetReps ?? params.currentRepsTarget;
    const targetRir = params.targetRir ?? 2;
    const streak = this.calculateStreak(params.sessionHistory, targetReps, targetRir);
    const requiredSessions = this.getRequiredSessionsForProgression(params.experienceLevel);
    const windowSessionsCount = Math.min(params.sessionHistory.length, 3);

    // ── 0. Precedencia de dolor articular (RF-08, CA-08.1, CA-08.2, D-20) ──
    if (params.painReports && params.painReports.length > 0 && params.exercise) {
      const stressedJoints = this.fatigueAdjuster.getInvolvedJoints(params.exercise);
      const relevantPains = params.painReports.filter((p) => stressedJoints.includes(p.joint));

      if (relevantPains.length > 0) {
        const jointSeverities = this.fatigueAdjuster.resolveJointSeverities(relevantPains);

        // Precedencia #1: Dolor severo en articulación involucrada
        const severeEntry = Array.from(jointSeverities.entries()).find(([_, intensity]) => intensity === 'severa');
        if (severeEntry) {
          const [joint] = severeEntry;
          const deloadLoad = Number((params.currentLoadKg * 0.90).toFixed(2));
          return {
            action: 'deload',
            next_load_kg: deloadLoad,
            next_reps_target: params.repsTargetMin ?? params.currentRepsTarget,
            reason: `Sobrecarga bloqueada por dolor severo en ${joint}: se excluye el ejercicio o se reduce carga (−10%) para proteger la articulación.`,
            streak_count: 0,
            window_sessions: windowSessionsCount
          };
        }

        // Precedencia #2: Dolor moderado en articulación involucrada
        const moderateEntry = Array.from(jointSeverities.entries()).find(([_, intensity]) => intensity === 'moderada');
        if (moderateEntry) {
          const [joint] = moderateEntry;
          const moderateCount = this.fatigueAdjuster.countSessionsWithPain(relevantPains, joint, 'moderada');
          if (moderateCount >= 2) {
            const reducedLoad = this.fatigueAdjuster.calculateReducedLoad(params.currentLoadKg, 10);
            return {
              action: 'reduce',
              next_load_kg: reducedLoad,
              next_reps_target: params.currentRepsTarget,
              reason: `Sobrecarga bloqueada por dolor moderado persistente en ${joint} (2+ sesiones): reducción de carga del 10% y volumen del 50%.`,
              streak_count: 0,
              window_sessions: windowSessionsCount
            };
          } else {
            // 1 sesión con dolor moderado -> pausar sobrecarga y mantener carga
            return {
              action: 'maintain',
              next_load_kg: params.currentLoadKg,
              next_reps_target: params.currentRepsTarget,
              reason: `Sobrecarga pausada por dolor moderado en ${joint}: se mantiene la carga (${params.currentLoadKg} kg) y se reduce volumen un 30%.`,
              streak_count: streak,
              window_sessions: windowSessionsCount
            };
          }
        }
      }
    }

    // ── 1. Penalización por inactividad (CL-08, CA-07.5) ──
    if (params.daysSinceLastSession !== undefined && params.daysSinceLastSession >= 14) {
      const reducedLoad = Number((params.currentLoadKg * 0.90).toFixed(2));
      const reason = params.daysSinceLastSession >= 28
        ? 'Inactividad prolongada (≥ 4 semanas): reducción de carga del 10% y reinicio de ciclo.'
        : 'Inactividad (≥ 2 semanas) → reducción de carga del 10%.';

      return {
        action: 'reduce',
        next_load_kg: reducedLoad,
        next_reps_target: params.repsTargetMin ?? params.currentRepsTarget,
        reason,
        streak_count: 0,
        window_sessions: windowSessionsCount
      };
    }

    // ── 2. Criterio de éxito y subida de carga / doble progresión (CA-07.1, CA-07.2) ──
    if (streak >= requiredSessions) {
      const isIncrementViable = params.isIncrementViable ?? true;
      const repsTargetMax = params.repsTargetMax ?? 12;

      // Doble progresión: si el incremento en kilos no es viable con el equipamiento
      if (!isIncrementViable) {
        if (params.currentRepsTarget < repsTargetMax) {
          const nextReps = params.currentRepsTarget + 1;
          return {
            action: 'increase_reps',
            next_load_kg: params.currentLoadKg,
            next_reps_target: nextReps,
            reason: `Doble progresión: +1 repetición (${nextReps} reps @ ${params.currentLoadKg} kg) antes de subir peso al no ser viable el incremento en kilos.`,
            streak_count: streak,
            window_sessions: windowSessionsCount
          };
        } else {
          return {
            action: 'maintain',
            next_load_kg: params.currentLoadKg,
            next_reps_target: params.currentRepsTarget,
            reason: `Techo de repeticiones (${params.currentRepsTarget} reps) alcanzado; se mantiene carga al no haber incremento disponible.`,
            streak_count: streak,
            window_sessions: windowSessionsCount
          };
        }
      }

      const increment = this.getLoadIncrement(params.experienceLevel, params.isCompound);
      const nextLoad = Number((params.currentLoadKg + increment).toFixed(2));
      const nextReps = params.repsTargetMin ?? params.currentRepsTarget;

      return {
        action: 'increase_load',
        next_load_kg: nextLoad,
        next_reps_target: nextReps,
        reason: `Se aumenta la carga (+${increment} kg) para nivel ${params.experienceLevel}: completaste las repeticiones objetivo con RIR ≥ ${targetRir} en ${streak} sesión(es) consecutiva(s).`,
        streak_count: streak,
        window_sessions: windowSessionsCount
      };
    }

    // ── 3. Manejo de fallos acumulados en la ventana de 3 sesiones (CA-07.2, CA-07.3) ──
    const windowAnalysis = this.analyzePerformanceWindow(params.sessionHistory, targetReps, targetRir, 3);

    if (windowAnalysis.consecutiveFailures >= 3) {
      const deloadLoad = Number((params.currentLoadKg * 0.90).toFixed(2));
      return {
        action: 'deload',
        next_load_kg: deloadLoad,
        next_reps_target: params.repsTargetMin ?? params.currentRepsTarget,
        reason: '3 sesiones consecutivas con fallo → propuesta de deload (−10% de carga) para disipar fatiga acumulada.',
        streak_count: 0,
        window_sessions: windowSessionsCount
      };
    }

    if (windowAnalysis.totalFailuresInWindow >= 2) {
      const reducedLoad = Number((params.currentLoadKg * 0.95).toFixed(2));
      return {
        action: 'reduce',
        next_load_kg: reducedLoad,
        next_reps_target: params.currentRepsTarget,
        reason: '2 fallos en la ventana de evaluación → reducción de carga del 5%.',
        streak_count: 0,
        window_sessions: windowSessionsCount
      };
    }

    if (windowAnalysis.totalFailuresInWindow === 1) {
      return {
        action: 'maintain',
        next_load_kg: params.currentLoadKg,
        next_reps_target: params.currentRepsTarget,
        reason: 'Fallo aislado en 1 sesión: se mantiene la carga para consolidar el objetivo.',
        streak_count: streak,
        window_sessions: windowSessionsCount
      };
    }

    return {
      action: 'maintain',
      next_load_kg: params.currentLoadKg,
      next_reps_target: params.currentRepsTarget,
      reason: `Se mantiene la carga: racha actual de ${streak}/${requiredSessions} sesión(es) exitosa(s) para nivel ${params.experienceLevel}.`,
      streak_count: streak,
      window_sessions: windowSessionsCount
    };
  }

  /**
   * Obtiene la sugerencia de progresión para una asignación de ejercicio específica (RF-07, CA-07.1, CA-07.2, CA-07.3).
   */
  async getProgressionSuggestion(
    assignmentId: string,
    athleteId: string
  ): Promise<ProgressionSuggestion> {
    const assignment = await this.mesocycleRepo.findAssignmentById(assignmentId);
    if (!assignment) {
      throw new NotFoundError('Asignación de ejercicio no encontrada.');
    }

    if (assignment.athlete_id !== athleteId) {
      throw new NotFoundError('Asignación de ejercicio no encontrada.');
    }

    const athlete = await this.athleteRepo.findById(athleteId);
    if (!athlete) {
      throw new NotFoundError('Atleta no encontrado.');
    }

    const setLogs = await this.setLogRepo.findByAthleteAndExercise(
      athleteId,
      assignment.exercise_id,
      20
    );

    const exerciseName = assignment.exercise?.name ?? 'Ejercicio';
    const isCompound = assignment.exercise?.is_compound ?? true;
    const initialRatio = assignment.exercise?.initial_load_ratio ?? (isCompound ? 0.75 : 0.40);
    const bodyWeight = athlete.weight_kg ?? 70;
    const fallbackInitialLoad = assignment.target_load_kg > 0
      ? assignment.target_load_kg
      : Math.round((bodyWeight * initialRatio) * 2) / 2;

    if (!setLogs || setLogs.length === 0) {
      return {
        assignment_id: assignment.id,
        exercise_name: exerciseName,
        current_load_kg: fallbackInitialLoad,
        suggestion: {
          action: 'initial',
          next_load_kg: fallbackInitialLoad,
          next_reps_target: assignment.target_reps,
          reason: `Carga estimada inicial (${fallbackInitialLoad} kg) a partir de tu peso corporal (${bodyWeight} kg) y nivel ${athlete.experience_level}.`
        },
        streak_count: 0,
        window_sessions: 0
      };
    }

    // Agrupar sets por sesión
    const sessionMap = new Map<string, { sessionId: string; date: string; sets: SetPerformance[] }>();
    for (const set of setLogs) {
      if (!sessionMap.has(set.session_id)) {
        sessionMap.set(set.session_id, {
          sessionId: set.session_id,
          date: set.client_timestamp,
          sets: []
        });
      }
      sessionMap.get(set.session_id)!.sets.push({
        set_number: set.set_number,
        reps_completed: set.reps_completed,
        weight_kg: set.weight_kg,
        rir: set.rir
      });
    }

    const sessionHistory = Array.from(sessionMap.values());
    const latestSession = sessionHistory[0];
    const latestLoad = latestSession?.sets[0]?.weight_kg ?? assignment.target_load_kg ?? fallbackInitialLoad;

    let daysSinceLastSession: number | undefined;
    if (latestSession?.date) {
      const lastDate = new Date(latestSession.date);
      const now = new Date();
      const diffMs = now.getTime() - lastDate.getTime();
      daysSinceLastSession = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    const involvedJoints = assignment.exercise
      ? this.fatigueAdjuster.getInvolvedJoints(assignment.exercise)
      : [];

    const painReports: JointPainReportItem[] = [];
    for (const joint of involvedJoints) {
      const records = await this.painReportRepo.findByAthleteAndJoint(athleteId, joint, 5);
      for (const r of records) {
        painReports.push({
          joint: r.joint,
          side: r.side,
          intensity: r.intensity,
          session_id: r.session_id,
          created_at: r.created_at
        });
      }
    }

    const evaluation = this.evaluateProgression({
      experienceLevel: athlete.experience_level,
      isCompound,
      currentLoadKg: latestLoad,
      currentRepsTarget: assignment.target_reps,
      sessionHistory,
      targetReps: assignment.target_reps,
      targetRir: assignment.target_rir ?? 2,
      repsTargetMin: assignment.target_reps,
      repsTargetMax: assignment.target_reps + 4,
      daysSinceLastSession,
      exercise: assignment.exercise,
      painReports
    });

    return {
      assignment_id: assignment.id,
      exercise_name: exerciseName,
      current_load_kg: latestLoad,
      suggestion: {
        action: evaluation.action,
        next_load_kg: evaluation.next_load_kg,
        next_reps_target: evaluation.next_reps_target,
        reason: evaluation.reason
      },
      streak_count: evaluation.streak_count,
      window_sessions: evaluation.window_sessions
    };
  }
}

export const progressionService = new ProgressionService();
