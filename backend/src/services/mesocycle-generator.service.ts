import {
  ExerciseRepository,
  exerciseRepository
} from '../repositories/exercise.repository.js';
import {
  MesocycleRepository,
  mesocycleRepository,
  type CreateMesocycleData,
  type CreateWeekPlanData,
  type CreateSessionPlanData,
  type CreateExerciseAssignmentData
} from '../repositories/mesocycle.repository.js';
import {
  AthleteRepository,
  athleteRepository
} from '../repositories/athlete.repository.js';
import { NotFoundError } from '../errors/app-error.js';
import type {
  AthleteProfile,
  Exercise,
  ExercisesPerSessionPreference,
  ExperienceLevel,
  MesocycleDetail,
  MovementPattern,
  MuscleGroup,
  PeriodizationType,
  TrainingGoal
} from '../schemas/generated/schemas.js';
import {
  routineEngineV2Service,
  MAX_SETS_PER_EXERCISE
} from './routine-engine-v2.service.js';

export interface GeneratePlanOptions {
  durationWeeks?: number;
  custom_duration_weeks?: number;
  customDurationWeeks?: number;
  target_exercises_per_session?: number;
  targetExercisesPerSession?: number;
  session_duration_minutes?: number;
  sessionDurationMinutes?: number;
  exercisesPerSessionPreference?: ExercisesPerSessionPreference;
  target_goal?: TrainingGoal;
  targetGoal?: TrainingGoal;
  availableDays?: number;
}

export const ALL_MOVEMENT_PATTERNS: MovementPattern[] = [
  'empuje',
  'tiron',
  'rodilla_dominante',
  'cadera_dominante',
  'core'
];

export const LIMITED_EQUIPMENT_WARNING = 'Volumen limitado por el equipamiento disponible';

export interface VolumeRange {
  min: number;
  max: number;
  target: number;
}

/**
 * Rangos de volumen semanal (series por patrón / grupo muscular por semana)
 * basados en Schoenfeld et al. (CA-02.3).
 * - Principiante: 10–14 series/músculo/semana (objetivo base: 12)
 * - Intermedio: 14–20 series/músculo/semana (objetivo base: 16)
 * - Avanzado: 18–24 series/músculo/semana (objetivo base: 20)
 */
export const SCHOENFELD_VOLUME_RANGES: Record<ExperienceLevel, VolumeRange> = {
  principiante: { min: 10, max: 14, target: 12 },
  intermedio: { min: 14, max: 20, target: 16 },
  avanzado: { min: 18, max: 24, target: 20 }
};

type LoadRatioCategory =
  | 'empuje_compuesto'
  | 'tiron_compuesto'
  | 'rodilla_dominante_compuesto'
  | 'cadera_dominante_compuesto'
  | 'core_monoarticular';

/**
 * Ratios de carga inicial por defecto (CA-02.5, CL-11) multiplicados por el peso corporal (kg).
 */
export const DEFAULT_INITIAL_LOAD_RATIOS: Record<
  LoadRatioCategory,
  Record<ExperienceLevel, number>
> = {
  empuje_compuesto: { principiante: 0.5, intermedio: 0.75, avanzado: 1.0 },
  tiron_compuesto: { principiante: 0.4, intermedio: 0.6, avanzado: 0.8 },
  rodilla_dominante_compuesto: { principiante: 0.5, intermedio: 0.8, avanzado: 1.2 },
  cadera_dominante_compuesto: { principiante: 0.6, intermedio: 0.9, avanzado: 1.3 },
  core_monoarticular: { principiante: 0.1, intermedio: 0.15, avanzado: 0.2 }
};

interface SessionSlotTemplate {
  name: string;
  pattern_slots: MovementPattern[];
}

export class MesocycleGeneratorService {
  constructor(
    private readonly exerciseRepo: ExerciseRepository = exerciseRepository,
    private readonly mesocycleRepo: MesocycleRepository = mesocycleRepository,
    private readonly athleteRepo: AthleteRepository = athleteRepository
  ) {}

  /**
   * Expande o ajusta dinámicamente los slots de patrones de un día para que coincida con targetExercisesCount (TASK-45).
   */
  expandPatternSlots(baseSlots: MovementPattern[], targetCount: number): MovementPattern[] {
    if (baseSlots.length === targetCount) {
      return [...baseSlots];
    }
    if (targetCount < baseSlots.length) {
      return baseSlots.slice(0, targetCount);
    }

    const nonCore = Array.from(new Set(baseSlots.filter((p) => p !== 'core')));
    const hasCore = baseSlots.includes('core');
    const pool = nonCore.length > 0 ? nonCore : baseSlots;

    const result: MovementPattern[] = [];
    const mainSlotsCount = hasCore ? targetCount - 1 : targetCount;

    for (let i = 0; i < mainSlotsCount; i++) {
      result.push(pool[i % pool.length]!);
    }

    if (hasCore) {
      result.push('core');
    }

    return result;
  }

  /**
   * Obtiene la plantilla de días y slots de patrones de movimiento según los días disponibles y ejercicios por sesión.
   * Diseñado para garantizar que los 5 patrones principales estén presentes semanalmente (CA-02.1)
   * y que el número de ejercicios por sesión sea dinámico (TASK-45).
   */
  getSplitTemplate(daysPerWeek: number, targetExercisesPerSession?: number): SessionSlotTemplate[] {
    const days = Math.max(1, Math.min(7, Math.round(daysPerWeek)));

    const templates: SessionSlotTemplate[] = (() => {
      switch (days) {
      case 1:
        // CL-01: 1 día full-body cubriendo todos los patrones
        return [
          {
            name: 'Día 1 - Full Body Integral',
            pattern_slots: [
              'rodilla_dominante',
              'empuje',
              'tiron',
              'cadera_dominante',
              'core'
            ]
          }
        ];

      case 2:
        // 2 días: Upper / Lower con core en ambas
        return [
          {
            name: 'Día 1 - Torso (Empuje/Tirón)',
            pattern_slots: ['empuje', 'tiron', 'empuje', 'tiron', 'core']
          },
          {
            name: 'Día 2 - Pierna (Rodilla/Cadera)',
            pattern_slots: [
              'rodilla_dominante',
              'cadera_dominante',
              'rodilla_dominante',
              'cadera_dominante',
              'core'
            ]
          }
        ];

      case 3:
        // 3 días: Push / Pull / Legs con core integrado
        return [
          {
            name: 'Día 1 - Empuje',
            pattern_slots: ['empuje', 'empuje', 'core']
          },
          {
            name: 'Día 2 - Tirón',
            pattern_slots: ['tiron', 'tiron', 'core']
          },
          {
            name: 'Día 3 - Pierna',
            pattern_slots: [
              'rodilla_dominante',
              'cadera_dominante',
              'rodilla_dominante',
              'core'
            ]
          }
        ];

      case 4:
        // 4 días: Torso A / Pierna A / Torso B / Pierna B
        return [
          {
            name: 'Día 1 - Torso A',
            pattern_slots: ['empuje', 'tiron', 'empuje', 'core']
          },
          {
            name: 'Día 2 - Pierna A',
            pattern_slots: [
              'rodilla_dominante',
              'cadera_dominante',
              'rodilla_dominante',
              'core'
            ]
          },
          {
            name: 'Día 3 - Torso B',
            pattern_slots: ['tiron', 'empuje', 'tiron', 'core']
          },
          {
            name: 'Día 4 - Pierna B',
            pattern_slots: [
              'cadera_dominante',
              'rodilla_dominante',
              'cadera_dominante',
              'core'
            ]
          }
        ];

      case 5:
        // 5 días: Push / Pull / Legs / Torso / Pierna
        return [
          {
            name: 'Día 1 - Empuje',
            pattern_slots: ['empuje', 'empuje', 'core']
          },
          {
            name: 'Día 2 - Tirón',
            pattern_slots: ['tiron', 'tiron', 'core']
          },
          {
            name: 'Día 3 - Pierna',
            pattern_slots: ['rodilla_dominante', 'cadera_dominante', 'core']
          },
          {
            name: 'Día 4 - Torso',
            pattern_slots: ['empuje', 'tiron', 'core']
          },
          {
            name: 'Día 5 - Pierna y Core',
            pattern_slots: ['rodilla_dominante', 'cadera_dominante', 'core']
          }
        ];

      case 6:
        // 6 días: PPL x 2
        return [
          {
            name: 'Día 1 - Empuje A',
            pattern_slots: ['empuje', 'empuje', 'core']
          },
          {
            name: 'Día 2 - Tirón A',
            pattern_slots: ['tiron', 'tiron', 'core']
          },
          {
            name: 'Día 3 - Pierna A',
            pattern_slots: ['rodilla_dominante', 'cadera_dominante', 'core']
          },
          {
            name: 'Día 4 - Empuje B',
            pattern_slots: ['empuje', 'empuje', 'core']
          },
          {
            name: 'Día 5 - Tirón B',
            pattern_slots: ['tiron', 'tiron', 'core']
          },
          {
            name: 'Día 6 - Pierna B',
            pattern_slots: ['cadera_dominante', 'rodilla_dominante', 'core']
          }
        ];

      case 7:
      default:
        // 7 días: 6 días PPL + 1 día movilidad/core
        return [
          {
            name: 'Día 1 - Empuje A',
            pattern_slots: ['empuje', 'empuje', 'core']
          },
          {
            name: 'Día 2 - Tirón A',
            pattern_slots: ['tiron', 'tiron', 'core']
          },
          {
            name: 'Día 3 - Pierna A',
            pattern_slots: ['rodilla_dominante', 'cadera_dominante', 'core']
          },
          {
            name: 'Día 4 - Empuje B',
            pattern_slots: ['empuje', 'empuje', 'core']
          },
          {
            name: 'Día 5 - Tirón B',
            pattern_slots: ['tiron', 'tiron', 'core']
          },
          {
            name: 'Día 6 - Pierna B',
            pattern_slots: ['cadera_dominante', 'rodilla_dominante', 'core']
          },
          {
            name: 'Día 7 - Core y Movilidad',
            pattern_slots: ['core', 'empuje', 'tiron', 'rodilla_dominante', 'cadera_dominante']
          }
        ];
    }
  })();

  if (targetExercisesPerSession && targetExercisesPerSession > 0) {
    return templates.map((template) => ({
      name: template.name,
      pattern_slots: this.expandPatternSlots(template.pattern_slots, targetExercisesPerSession)
    }));
  }

  return templates;
}

  /**
   * Determina si el atleta tiene solo equipamiento de peso corporal.
   */
  isBodyweightOnly(athlete: AthleteProfile): boolean {
    if (!athlete.equipment || athlete.equipment.length === 0) return true;
    return athlete.equipment.every(
      (eq) => eq.id === 'bodyweight' || eq.id === 'sin_equipamiento' || eq.id === 'none'
    );
  }

  /**
   * Comprueba si el equipamiento del atleta limita alcanzar el volumen óptimo (CA-02.2, CL-21).
   */
  isEquipmentConstrained(athlete: AthleteProfile, catalog: Exercise[]): boolean {
    const isBwOnly = this.isBodyweightOnly(athlete);

    // Si el atleta solo tiene peso corporal y es de nivel intermedio/avanzado, el volumen/sobrecarga es limitado
    if (isBwOnly && athlete.experience_level === 'avanzado') {
      return true;
    }

    const athleteEquipmentIds = athlete.equipment.map((eq) => eq.id);

    // Verificar si para algún patrón de movimiento hay escasez de ejercicios
    for (const pattern of ALL_MOVEMENT_PATTERNS) {
      const available = this.filterCandidateExercises(catalog, pattern, athleteEquipmentIds);
      if (available.length < 1) {
        return true;
      }
    }

    // Si solo tiene peso corporal con >3 días de entrenamiento, también se considera limitado
    if (isBwOnly && athlete.available_days_per_week >= 4) {
      return true;
    }

    return false;
  }

  /**
   * Filtra estrictamente los ejercicios del catálogo compatibles con el patrón y el equipamiento (CA-02.2).
   */
  filterCandidateExercises(
    catalog: Exercise[],
    pattern: MovementPattern,
    allowedEquipmentIds: string[]
  ): Exercise[] {
    const isBwOnly =
      allowedEquipmentIds.length === 0 ||
      allowedEquipmentIds.every(
        (id) => id === 'bodyweight' || id === 'none' || id === 'sin_equipamiento'
      );

    const equipSet = new Set(allowedEquipmentIds);
    equipSet.add('bodyweight');
    equipSet.add('none');
    equipSet.add('sin_equipamiento');

    return catalog.filter((e) => {
      if (!e.is_active) return false;
      if (e.movement_pattern !== pattern) return false;

      if (isBwOnly) {
        return (
          e.equipment_id === 'bodyweight' ||
          e.equipment_id === 'none' ||
          e.equipment_id === 'sin_equipamiento'
        );
      }

      return equipSet.has(e.equipment_id);
    });
  }

  /**
   * Calcula el conteo de asignaciones por patrón de movimiento en una semana planificada.
   */
  getMovementPatternDistribution(
    weekPlan: { sessions: { exercise_assignments: { exercise_id: string }[] }[] },
    catalog: Exercise[]
  ): Record<MovementPattern, number> {
    const exerciseMap = new Map<string, Exercise>(catalog.map((e) => [e.id, e]));

    const counts: Record<MovementPattern, number> = {
      empuje: 0,
      tiron: 0,
      rodilla_dominante: 0,
      cadera_dominante: 0,
      core: 0
    };

    for (const session of weekPlan.sessions) {
      for (const assignment of session.exercise_assignments) {
        const ex = exerciseMap.get(assignment.exercise_id);
        if (ex && ex.movement_pattern in counts) {
          counts[ex.movement_pattern]++;
        }
      }
    }

    return counts;
  }

  /**
   * Comprueba si una semana cubre los 5 patrones de movimiento principales (CA-02.1).
   */
  hasBalancedMovementPatterns(
    weekPlan: { sessions: { exercise_assignments: { exercise_id: string }[] }[] },
    catalog: Exercise[]
  ): boolean {
    const dist = this.getMovementPatternDistribution(weekPlan, catalog);
    return ALL_MOVEMENT_PATTERNS.every((pattern) => dist[pattern] > 0);
  }

  /**
   * Obtiene el rango de volumen semanal de Schoenfeld et al. para un nivel de experiencia.
   */
  getSchoenfeldVolumeRange(level: ExperienceLevel): VolumeRange {
    return SCHOENFELD_VOLUME_RANGES[level];
  }

  /**
   * Calcula la distribución de series para los slots de un patrón en la semana
   * asegurando que la suma de series cumpla con el rango de Schoenfeld (CA-02.3).
   * En semanas de descarga (isDeload), aplica la reducción de ~40% (CA-10.2).
   */
  calculateSetsDistribution(
    experienceLevel: ExperienceLevel,
    totalSlots: number,
    isDeload = false,
    enforceMaxSets = false
  ): number[] {
    if (totalSlots <= 0) return [];

    const range = this.getSchoenfeldVolumeRange(experienceLevel);
    const targetSets = range.target;

    const baseSetsPerSlot = Math.floor(targetSets / totalSlots);
    const remainder = targetSets % totalSlots;

    const distribution: number[] = [];
    let excessSets = 0;

    for (let i = 0; i < totalSlots; i++) {
      let sets = i < remainder ? baseSetsPerSlot + 1 : baseSetsPerSlot;
      if (isDeload) {
        // Reducción de ~40% de volumen para deload (CA-10.2)
        distribution.push(Math.max(1, Math.round(sets * 0.6)));
      } else {
        // Aplica límite de máximo 4 series por ejercicio si enforceMaxSets está activo (TASK-45)
        // Si se necesita más volumen, debe usar el siguiente ejercicio seleccionado
        if (enforceMaxSets) {
          if (sets > MAX_SETS_PER_EXERCISE) {
            excessSets += sets - MAX_SETS_PER_EXERCISE;
            sets = MAX_SETS_PER_EXERCISE;
          } else if (excessSets > 0 && sets < MAX_SETS_PER_EXERCISE) {
            const canAdd = Math.min(excessSets, MAX_SETS_PER_EXERCISE - sets);
            sets += canAdd;
            excessSets -= canAdd;
          }
        }
        distribution.push(sets);
      }
    }

    if (excessSets > 0 && enforceMaxSets && !isDeload) {
      for (let i = 0; i < distribution.length && excessSets > 0; i++) {
        const current = distribution[i];
        if (typeof current === 'number' && current < MAX_SETS_PER_EXERCISE) {
          const canAdd = Math.min(excessSets, MAX_SETS_PER_EXERCISE - current);
          distribution[i] = current + canAdd;
          excessSets -= canAdd;
        }
      }
    }

    return distribution;
  }

  /**
   * Calcula el volumen total semanal en series agrupado por patrón de movimiento.
   */
  getWeeklyVolumeByPattern(
    weekPlan: { sessions: { exercise_assignments: { exercise_id: string; target_sets?: number }[] }[] },
    catalog: Exercise[]
  ): Record<MovementPattern, number> {
    const exerciseMap = new Map<string, Exercise>(catalog.map((e) => [e.id, e]));
    const counts: Record<MovementPattern, number> = {
      empuje: 0,
      tiron: 0,
      rodilla_dominante: 0,
      cadera_dominante: 0,
      core: 0
    };

    for (const session of weekPlan.sessions) {
      for (const assignment of session.exercise_assignments) {
        const ex = exerciseMap.get(assignment.exercise_id);
        if (ex && ex.movement_pattern in counts) {
          counts[ex.movement_pattern] += assignment.target_sets || 0;
        }
      }
    }

    return counts;
  }

  /**
   * Calcula el volumen total semanal en series agrupado por grupo muscular principal.
   */
  getWeeklyVolumeByMuscleGroup(
    weekPlan: { sessions: { exercise_assignments: { exercise_id: string; target_sets?: number }[] }[] },
    catalog: Exercise[]
  ): Record<MuscleGroup, number> {
    const exerciseMap = new Map<string, Exercise>(catalog.map((e) => [e.id, e]));
    const counts: Record<MuscleGroup, number> = {
      pecho: 0,
      espalda: 0,
      cuadriceps: 0,
      isquiosurales: 0,
      gluteos: 0,
      hombros: 0,
      biceps: 0,
      triceps: 0,
      pantorrillas: 0,
      core: 0
    };

    for (const session of weekPlan.sessions) {
      for (const assignment of session.exercise_assignments) {
        const ex = exerciseMap.get(assignment.exercise_id);
        if (ex && ex.primary_muscle in counts) {
          counts[ex.primary_muscle] += assignment.target_sets || 0;
        }
      }
    }

    return counts;
  }

  /**
   * Valida si una semana cumple con los rangos de volumen de Schoenfeld para el nivel dado (CA-02.3).
   */
  validateSchoenfeldCompliance(
    weekPlan: { sessions: { exercise_assignments: { exercise_id: string; target_sets?: number }[] }[] },
    catalog: Exercise[],
    level: ExperienceLevel,
    isDeload = false
  ): {
    compliant: boolean;
    byPattern: Record<MovementPattern, { sets: number; min: number; max: number; inRange: boolean }>;
    byMuscle: Record<string, { sets: number; inRange: boolean }>;
  } {
    const range = this.getSchoenfeldVolumeRange(level);
    const patternVolume = this.getWeeklyVolumeByPattern(weekPlan, catalog);
    const muscleVolume = this.getWeeklyVolumeByMuscleGroup(weekPlan, catalog);

    const byPattern = {} as Record<
      MovementPattern,
      { sets: number; min: number; max: number; inRange: boolean }
    >;

    let compliant = true;

    for (const pattern of ALL_MOVEMENT_PATTERNS) {
      const sets = patternVolume[pattern];
      const inRange = isDeload
        ? sets < range.min
        : sets >= range.min && sets <= range.max;

      if (!inRange) {
        compliant = false;
      }

      byPattern[pattern] = {
        sets,
        min: range.min,
        max: range.max,
        inRange
      };
    }

    const byMuscle: Record<string, { sets: number; inRange: boolean }> = {};
    for (const [muscle, sets] of Object.entries(muscleVolume)) {
      if (sets > 0) {
        byMuscle[muscle] = {
          sets,
          inRange: isDeload ? true : sets >= 1
        };
      }
    }

    return {
      compliant,
      byPattern,
      byMuscle
    };
  }

  /**
   * Determina la duración por defecto del mesociclo según el nivel de experiencia (CA-10.1).
   * - Principiante: 4 semanas (3 trabajo + 1 deload)
   * - Intermedio: 6 semanas (5 trabajo + 1 deload)
   * - Avanzado: 8 semanas (7 trabajo + 1 deload)
   */
  getDefaultMesocycleDuration(level: ExperienceLevel): number {
    switch (level) {
      case 'principiante':
        return 4;
      case 'intermedio':
        return 6;
      case 'avanzado':
        return 8;
      default:
        return 4;
    }
  }

  /**
   * Obtiene el ratio de carga inicial por defecto según el patrón, tipo y nivel (CA-02.5).
   */
  getDefaultInitialLoadRatio(
    pattern: MovementPattern,
    isCompound: boolean,
    level: ExperienceLevel
  ): number {
    if (pattern === 'core' || !isCompound) {
      return DEFAULT_INITIAL_LOAD_RATIOS.core_monoarticular[level];
    }

    switch (pattern) {
      case 'empuje':
        return DEFAULT_INITIAL_LOAD_RATIOS.empuje_compuesto[level];
      case 'tiron':
        return DEFAULT_INITIAL_LOAD_RATIOS.tiron_compuesto[level];
      case 'rodilla_dominante':
        return DEFAULT_INITIAL_LOAD_RATIOS.rodilla_dominante_compuesto[level];
      case 'cadera_dominante':
        return DEFAULT_INITIAL_LOAD_RATIOS.cadera_dominante_compuesto[level];
      default:
        return DEFAULT_INITIAL_LOAD_RATIOS.core_monoarticular[level];
    }
  }

  /**
   * Calcula la carga inicial exacta estimada (CA-02.5, CL-11) redondeada a paso 0.5 kg.
   */
  calculateInitialLoad(athlete: AthleteProfile, exercise: Exercise): number {
    if (
      exercise.equipment_id === 'bodyweight' ||
      exercise.equipment_id === 'sin_equipamiento' ||
      exercise.equipment_id === 'none'
    ) {
      return 0.0;
    }

    const ratio =
      exercise.initial_load_ratio > 0
        ? exercise.initial_load_ratio
        : this.getDefaultInitialLoadRatio(
            exercise.movement_pattern,
            exercise.is_compound,
            athlete.experience_level
          );

    const rawLoad = athlete.weight_kg * ratio;
    return Math.round(rawLoad * 2) / 2;
  }

  /**
   * Calcula los parámetros de progresión semanal (carga, reps, rir) según periodización (CA-02.4).
   * - Lineal (fuerza): incremento progresivo de carga (+2.5% por semana de trabajo), 5 reps, RIR 2.
   * - Ondulante (hipertrofia/mixto): variación ondulatoria de intensidad y repeticiones.
   * - Deload (última semana): -10% de carga base (CA-10.2), RIR 3.
   */
  calculateWeeklyProgression(
    baseLoad: number,
    weekNumber: number,
    _totalWeeks: number,
    periodizationType: PeriodizationType,
    trainingGoal: TrainingGoal,
    isDeload: boolean
  ): { target_load_kg: number; target_reps: number; target_rir: number } {
    if (isDeload) {
      // CA-10.2: Semana de descarga (-10% intensidad de carga base, RIR 3)
      const deloadLoad =
        baseLoad === 0 ? 0 : Math.round(baseLoad * 0.9 * 2) / 2;
      return {
        target_load_kg: deloadLoad,
        target_reps: trainingGoal === 'fuerza' ? 5 : 10,
        target_rir: 3
      };
    }

    if (periodizationType === 'lineal') {
      // CA-02.4: Periodización lineal para fuerza (+2.5% carga semanal progresiva, 5 reps, RIR 2)
      const loadMultiplier = 1 + (weekNumber - 1) * 0.025;
      const targetLoad =
        baseLoad === 0 ? 0 : Math.round(baseLoad * loadMultiplier * 2) / 2;

      return {
        target_load_kg: targetLoad,
        target_reps: 5,
        target_rir: 2
      };
    } else {
      // CA-02.4: Periodización ondulante para hipertrofia y mixto
      // Ondulación cíclica de volumen e intensidad entre semanas de trabajo
      const wavePhase = (weekNumber - 1) % 3; // 0, 1, 2
      const cycleStep = Math.floor((weekNumber - 1) / 3) * 0.025;

      let repTarget = 10;
      let intensityMultiplier = 1.0;

      if (wavePhase === 0) {
        repTarget = 12;
        intensityMultiplier = 1.0 + cycleStep;
      } else if (wavePhase === 1) {
        repTarget = 10;
        intensityMultiplier = 1.05 + cycleStep;
      } else {
        repTarget = 8;
        intensityMultiplier = 1.075 + cycleStep;
      }

      const targetLoad =
        baseLoad === 0 ? 0 : Math.round(baseLoad * intensityMultiplier * 2) / 2;

      return {
        target_load_kg: targetLoad,
        target_reps: repTarget,
        target_rir: 2
      };
    }
  }

  /**
   * Genera la estructura de mesociclo equilibrando los 5 patrones de movimiento,
   * asignando series según los rangos de volumen de Schoenfeld (CA-02.3),
   * calculando periodización (lineal/ondulante, CA-02.4) y estimando carga inicial (CA-02.5),
   * y aplicando el ajuste de volumen con advertencia si el equipamiento es limitado (CA-02.2, CL-21).
   */
  async generatePlanStructure(
    athlete: AthleteProfile,
    catalog: Exercise[],
    durationWeeksOrOptions?: number | GeneratePlanOptions,
    optionsArg?: GeneratePlanOptions
  ): Promise<CreateMesocycleData> {
    let durationWeeks: number | undefined;
    let options: GeneratePlanOptions | undefined;

    if (typeof durationWeeksOrOptions === 'number') {
      durationWeeks = durationWeeksOrOptions;
      options = optionsArg;
    } else if (durationWeeksOrOptions && typeof durationWeeksOrOptions === 'object') {
      options = durationWeeksOrOptions;
      durationWeeks =
        options.durationWeeks ??
        options.custom_duration_weeks ??
        options.customDurationWeeks;
    } else {
      options = optionsArg;
    }

    const defaultDuration = this.getDefaultMesocycleDuration(athlete.experience_level);
    const weeksCount = durationWeeks
      ? Math.max(4, Math.min(8, durationWeeks))
      : defaultDuration;

    const targetExercises =
      options?.target_exercises_per_session ??
      options?.targetExercisesPerSession ??
      (options?.exercisesPerSessionPreference?.mode === 'manual'
        ? (options?.exercisesPerSessionPreference?.customCount ?? undefined)
        : options?.sessionDurationMinutes
          ? routineEngineV2Service.getTimeBlockByDuration(options.sessionDurationMinutes)?.recommended_exercises
          : undefined);

    const daysPerWeek = options?.availableDays ?? athlete.available_days_per_week;
    const athleteEquipmentIds = athlete.equipment.map((eq) => eq.id);
    const splitTemplate = this.getSplitTemplate(daysPerWeek, targetExercises);
    const isConstrained = this.isEquipmentConstrained(athlete, catalog);

    // Determinar tipo de periodización por objetivo
    const goal = options?.target_goal ?? options?.targetGoal ?? athlete.training_goal;
    const periodizationType: PeriodizationType =
      goal === 'fuerza' ? 'lineal' : 'ondulante';

    const weeks: CreateWeekPlanData[] = [];

    // Pre-seleccionar ejercicios por slot para mantener consistencia a lo largo del mesociclo
    const assignedExercisesPerSlot = new Map<string, Exercise>();

    // Contar slots de cada patrón en una semana típica del split
    const patternSlotCounts: Record<MovementPattern, number> = {
      empuje: 0,
      tiron: 0,
      rodilla_dominante: 0,
      cadera_dominante: 0,
      core: 0
    };
    splitTemplate.forEach((template) => {
      template.pattern_slots.forEach((pattern) => {
        patternSlotCounts[pattern]++;
      });
    });

    for (let w = 1; w <= weeksCount; w++) {
      const isDeload = w === weeksCount; // Última semana siempre deload
      const sessions: CreateSessionPlanData[] = [];

      // Calcular la distribución exacta de series para cada patrón en esta semana
      const enforceMaxSets = Boolean(targetExercises && targetExercises > 0);
      const patternSetsDistribution: Record<MovementPattern, number[]> = {
        empuje: this.calculateSetsDistribution(athlete.experience_level, patternSlotCounts.empuje, isDeload, enforceMaxSets),
        tiron: this.calculateSetsDistribution(athlete.experience_level, patternSlotCounts.tiron, isDeload, enforceMaxSets),
        rodilla_dominante: this.calculateSetsDistribution(athlete.experience_level, patternSlotCounts.rodilla_dominante, isDeload, enforceMaxSets),
        cadera_dominante: this.calculateSetsDistribution(athlete.experience_level, patternSlotCounts.cadera_dominante, isDeload, enforceMaxSets),
        core: this.calculateSetsDistribution(athlete.experience_level, patternSlotCounts.core, isDeload, enforceMaxSets)
      };

      const patternSlotIndexCounter: Record<MovementPattern, number> = {
        empuje: 0,
        tiron: 0,
        rodilla_dominante: 0,
        cadera_dominante: 0,
        core: 0
      };

      splitTemplate.forEach((template, dayIndex) => {
        const assignments: CreateExerciseAssignmentData[] = [];
        const usedInThisSession = new Set<string>();

        template.pattern_slots.forEach((pattern, slotIndex) => {
          const slotKey = `${dayIndex}_${slotIndex}_${pattern}`;
          let selectedExercise = assignedExercisesPerSlot.get(slotKey);

          if (!selectedExercise) {
            const candidates = this.filterCandidateExercises(
              catalog,
              pattern,
              athleteEquipmentIds
            );

            const unusedCandidates = candidates.filter((c) => !usedInThisSession.has(c.id));

            if (unusedCandidates.length > 0) {
              selectedExercise = unusedCandidates[0];
            } else if (enforceMaxSets) {
              // Si se especificó target dinámico y se agotaron los candidatos de este patrón, buscar en otros patrones del mismo día
              const otherDayPatterns = Array.from(new Set(template.pattern_slots)).filter((p) => p !== pattern);
              let fallbackExercise: Exercise | undefined;
              for (const altPattern of otherDayPatterns) {
                const altCandidates = this.filterCandidateExercises(
                  catalog,
                  altPattern,
                  athleteEquipmentIds
                );
                const unusedAlt = altCandidates.filter((c) => !usedInThisSession.has(c.id));
                if (unusedAlt.length > 0) {
                  fallbackExercise = unusedAlt[0];
                  break;
                }
              }
              selectedExercise = fallbackExercise || (candidates.length > 0 ? candidates[slotIndex % candidates.length] : undefined);
            } else if (candidates.length > 0) {
              selectedExercise = candidates[slotIndex % candidates.length];
            } else {
              // Si no hay candidato estricto, buscar candidatos de peso corporal del patrón
              const bwCandidates = catalog.filter(
                (e) =>
                  e.movement_pattern === pattern &&
                  (e.equipment_id === 'bodyweight' ||
                    e.equipment_id === 'none' ||
                    e.equipment_id === 'sin_equipamiento') &&
                  e.is_active
              );
              const unusedBw = bwCandidates.filter((c) => !usedInThisSession.has(c.id));
              selectedExercise =
                unusedBw[0] ||
                bwCandidates[0] ||
                catalog.find((e) => e.movement_pattern === pattern) ||
                catalog[0]!;
            }

            assignedExercisesPerSlot.set(slotKey, selectedExercise!);
          }

          usedInThisSession.add(selectedExercise!.id);

          const currentSlotIdx = patternSlotIndexCounter[pattern]++;
          const rawAssignedSets =
            patternSetsDistribution[pattern][currentSlotIdx] || (isDeload ? 2 : 3);
          const assignedSets = isDeload
            ? Math.max(1, rawAssignedSets)
            : (enforceMaxSets ? Math.min(MAX_SETS_PER_EXERCISE, Math.max(1, rawAssignedSets)) : rawAssignedSets);

          const baseLoad = this.calculateInitialLoad(athlete, selectedExercise!);
          const progression = this.calculateWeeklyProgression(
            baseLoad,
            w,
            weeksCount,
            periodizationType,
            goal,
            isDeload
          );

          assignments.push({
            exercise_id: selectedExercise!.id,
            order_in_session: slotIndex + 1,
            target_sets: assignedSets,
            target_reps: progression.target_reps,
            target_rir: progression.target_rir,
            target_load_kg: progression.target_load_kg,
            notes: isConstrained ? LIMITED_EQUIPMENT_WARNING : undefined
          });
        });

        sessions.push({
          day_number: dayIndex + 1,
          name: template.name,
          exercise_assignments: assignments
        });
      });

      weeks.push({
        week_number: w,
        is_deload: isDeload,
        sessions
      });
    }

    const baseName = `Mesociclo ${goal.toUpperCase()} - ${athlete.experience_level}`;
    const mesocycleName = isConstrained
      ? `${baseName} (${LIMITED_EQUIPMENT_WARNING})`
      : baseName;

    return {
      athlete_id: athlete.id,
      name: mesocycleName,
      experience_level: athlete.experience_level,
      training_goal: goal,
      periodization_type: periodizationType,
      duration_weeks: weeksCount,
      target_exercises_per_session: targetExercises,
      session_duration_minutes: options?.session_duration_minutes ?? options?.sessionDurationMinutes,
      weeks
    };
  }

  /**
   * Genera la estructura completa consultando el catálogo de ejercicios del repositorio.
   */
  async generateForAthlete(
    athlete: AthleteProfile,
    durationWeeksOrOptions?: number | GeneratePlanOptions,
    optionsArg?: GeneratePlanOptions
  ): Promise<CreateMesocycleData> {
    const catalog = await this.exerciseRepo.findAll({ limit: 500 });
    return this.generatePlanStructure(athlete, catalog, durationWeeksOrOptions, optionsArg);
  }

  /**
   * Persiste la estructura del mesociclo generado en base de datos.
   */
  async persistPlan(plan: CreateMesocycleData) {
    return this.mesocycleRepo.create(plan);
  }

  /**
   * Genera y persiste un nuevo mesociclo para un atleta autenticado (RF-02, CA-02.1-CA-02.5).
   * Archiva cualquier mesociclo previo activo.
   */
  async generateAndPersistForAthlete(
    athleteId: string,
    options?: GeneratePlanOptions
  ): Promise<MesocycleDetail> {
    const athlete = await this.athleteRepo.findById(athleteId);
    if (!athlete) {
      throw new NotFoundError('Perfil de atleta no encontrado.');
    }

    const effectiveGoal = options?.target_goal || options?.targetGoal;
    const effectiveAthlete: AthleteProfile = effectiveGoal
      ? { ...athlete, training_goal: effectiveGoal }
      : athlete;

    const planData = await this.generateForAthlete(
      effectiveAthlete,
      options
    );

    // Archivar mesociclos activos previos
    await this.mesocycleRepo.archiveActiveByAthleteId(athleteId);

    // Persistir nuevo mesociclo de forma atómica
    return this.persistPlan(planData);
  }

  /**
   * Recupera el mesociclo activo actual de un atleta autenticado.
   */
  async getCurrentMesocycle(athleteId: string): Promise<MesocycleDetail> {
    const active = await this.mesocycleRepo.findActiveByAthleteId(athleteId);
    if (!active) {
      throw new NotFoundError('No se encontró un mesociclo activo para el atleta.');
    }
    return active;
  }

  /**
   * Recupera un mesociclo por ID asegurando aislamiento de datos (RNF-06).
   */
  async getMesocycleById(athleteId: string, mesocycleId: string): Promise<MesocycleDetail> {
    const mesocycle = await this.mesocycleRepo.findById(mesocycleId);
    if (!mesocycle || mesocycle.athlete_id !== athleteId) {
      throw new NotFoundError('Mesociclo no encontrado o no disponible.');
    }
    return mesocycle;
  }
}

export const mesocycleGeneratorService = new MesocycleGeneratorService();
