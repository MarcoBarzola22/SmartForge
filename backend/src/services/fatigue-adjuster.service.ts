import type {
  Joint,
  BodySide,
  MovementPattern,
  MuscleGroup,
  PainIntensity,
  Exercise
} from '../schemas/generated/schemas.js';

export interface ExerciseSummary {
  id?: string;
  name?: string;
  movement_pattern?: MovementPattern;
  primary_muscle?: MuscleGroup;
  secondary_muscles?: MuscleGroup[] | string[];
  equipment_id?: string;
  is_compound?: boolean;
}

export interface JointAnatomicalConfig {
  name: Joint;
  description: string;
  primary_muscles: MuscleGroup[];
  movement_patterns: MovementPattern[];
  isPrimaryFor: (exercise: ExerciseSummary) => boolean;
  stresses: (exercise: ExerciseSummary) => boolean;
}

/**
 * Matriz de mapeo anatómico entre las 7 articulaciones biomecánicas del sistema y los ejercicios.
 * Fuente: RF-08, CA-08.1, Constitución §1.
 */
export const ANATOMICAL_JOINT_MATRIX: Record<Joint, JointAnatomicalConfig> = {
  hombro: {
    name: 'hombro',
    description: 'Articulación glenohumeral y complejo escapular (empuje superior, elevaciones, dominadas, remos)',
    primary_muscles: ['hombros'],
    movement_patterns: ['empuje', 'tiron'],
    isPrimaryFor: (exercise: ExerciseSummary): boolean => {
      if (exercise.primary_muscle === 'hombros') return true;
      if (exercise.movement_pattern === 'empuje' && exercise.primary_muscle === 'pecho') return true;
      return false;
    },
    stresses: (exercise: ExerciseSummary): boolean => {
      if (exercise.primary_muscle === 'hombros') return true;
      if (exercise.movement_pattern === 'empuje') return true;
      if (exercise.movement_pattern === 'tiron' && exercise.primary_muscle === 'espalda') return true;
      const idOrName = `${exercise.id || ''} ${exercise.name || ''}`.toLowerCase();
      if (
        idOrName.includes('elevacion') ||
        idOrName.includes('press') ||
        idOrName.includes('fondos') ||
        idOrName.includes('apertura') ||
        idOrName.includes('dominada') ||
        idOrName.includes('jalon') ||
        idOrName.includes('remo') ||
        idOrName.includes('pullover') ||
        idOrName.includes('pull_over') ||
        idOrName.includes('face_pull') ||
        idOrName.includes('pike')
      ) {
        return true;
      }
      return false;
    }
  },

  codo: {
    name: 'codo',
    description: 'Articulación del codo (flexo-extensión de brazos, curls, extensiones de tríceps, empujes/tirones compuestos)',
    primary_muscles: ['biceps', 'triceps'],
    movement_patterns: ['empuje', 'tiron'],
    isPrimaryFor: (exercise: ExerciseSummary): boolean => {
      return exercise.primary_muscle === 'biceps' || exercise.primary_muscle === 'triceps';
    },
    stresses: (exercise: ExerciseSummary): boolean => {
      if (exercise.primary_muscle === 'biceps' || exercise.primary_muscle === 'triceps') return true;
      if (exercise.is_compound && (exercise.movement_pattern === 'empuje' || exercise.movement_pattern === 'tiron')) {
        return true;
      }
      const idOrName = `${exercise.id || ''} ${exercise.name || ''}`.toLowerCase();
      if (
        idOrName.includes('curl') ||
        idOrName.includes('triceps') ||
        idOrName.includes('fondos') ||
        idOrName.includes('frances') ||
        idOrName.includes('pushdown')
      ) {
        return true;
      }
      return false;
    }
  },

  muneca: {
    name: 'muneca',
    description: 'Articulación de la muñeca (soporte de peso libre, agarre de barra/mancuernas, flexiones en suelo)',
    primary_muscles: ['biceps', 'triceps'],
    movement_patterns: ['empuje', 'tiron'],
    isPrimaryFor: (exercise: ExerciseSummary): boolean => {
      const idOrName = `${exercise.id || ''} ${exercise.name || ''}`.toLowerCase();
      return idOrName.includes('antebrazo') || idOrName.includes('muneca') || idOrName.includes('wrist');
    },
    stresses: (exercise: ExerciseSummary): boolean => {
      const idOrName = `${exercise.id || ''} ${exercise.name || ''}`.toLowerCase();
      if (idOrName.includes('antebrazo') || idOrName.includes('muneca') || idOrName.includes('wrist')) {
        return true;
      }
      // Straight barbell / heavy free-weight pressing & curling or floor pushups
      if (
        exercise.primary_muscle === 'biceps' &&
        (exercise.equipment_id === 'barbell' || idOrName.includes('barra_recta'))
      ) {
        return true;
      }
      if (
        exercise.movement_pattern === 'empuje' &&
        (idOrName.includes('flexiones') ||
          exercise.equipment_id === 'barbell' ||
          exercise.equipment_id === 'dumbbells' ||
          exercise.equipment_id === 'bodyweight')
      ) {
        return true;
      }
      return false;
    }
  },

  columna_lumbar: {
    name: 'columna_lumbar',
    description: 'Columna lumbar y erectores espinales (carga axial vertical, bisagras pesadas de cadera, sentadillas con barra libre, remos inclinados)',
    primary_muscles: ['gluteos', 'isquiosurales', 'espalda', 'core'],
    movement_patterns: ['cadera_dominante', 'rodilla_dominante', 'tiron', 'core'],
    isPrimaryFor: (exercise: ExerciseSummary): boolean => {
      const idOrName = `${exercise.id || ''} ${exercise.name || ''}`.toLowerCase();
      return (
        idOrName.includes('buenos_dias') ||
        idOrName.includes('hiperextension') ||
        idOrName.includes('peso_muerto_convencional') ||
        idOrName.includes('peso_muerto_piernas_rigidas')
      );
    },
    stresses: (exercise: ExerciseSummary): boolean => {
      const idOrName = `${exercise.id || ''} ${exercise.name || ''}`.toLowerCase();

      // Deadlifts and heavy hip hinges
      if (exercise.movement_pattern === 'cadera_dominante' && exercise.is_compound) {
        return true;
      }
      // Heavy axial loading knee-dominant squats (barbell, goblet, etc.)
      if (
        exercise.movement_pattern === 'rodilla_dominante' &&
        exercise.is_compound &&
        (exercise.equipment_id === 'barbell' ||
          idOrName.includes('sentadilla_trasera') ||
          idOrName.includes('sentadilla_frontal') ||
          idOrName.includes('box_squat') ||
          idOrName.includes('zercher') ||
          idOrName.includes('overhead'))
      ) {
        return true;
      }
      // Bent over heavy rows and standing presses
      if (
        idOrName.includes('remo_con_barra') ||
        idOrName.includes('remo_pendlay') ||
        idOrName.includes('remo_barra_t') ||
        idOrName.includes('remo_kettlebell_renegade') ||
        idOrName.includes('press_militar_barra_pie') ||
        idOrName.includes('caminata_del_granjero') ||
        idOrName.includes('farmer') ||
        idOrName.includes('buenos_dias') ||
        idOrName.includes('hiperextension')
      ) {
        return true;
      }
      return false;
    }
  },

  cadera: {
    name: 'cadera',
    description: 'Articulación coxofemoral (bisagras de cadera, extensión de cadera, sentadillas, zancadas, abducciones)',
    primary_muscles: ['gluteos', 'isquiosurales', 'cuadriceps'],
    movement_patterns: ['cadera_dominante', 'rodilla_dominante'],
    isPrimaryFor: (exercise: ExerciseSummary): boolean => {
      if (exercise.movement_pattern === 'cadera_dominante') return true;
      if (exercise.primary_muscle === 'gluteos') return true;
      return false;
    },
    stresses: (exercise: ExerciseSummary): boolean => {
      if (exercise.movement_pattern === 'cadera_dominante') return true;
      if (exercise.primary_muscle === 'gluteos' || exercise.primary_muscle === 'isquiosurales') return true;
      if (exercise.movement_pattern === 'rodilla_dominante' && exercise.is_compound) return true;
      const idOrName = `${exercise.id || ''} ${exercise.name || ''}`.toLowerCase();
      if (
        idOrName.includes('hip_thrust') ||
        idOrName.includes('puente') ||
        idOrName.includes('peso_muerto') ||
        idOrName.includes('sentadilla') ||
        idOrName.includes('prensa') ||
        idOrName.includes('zancada') ||
        idOrName.includes('abduccion') ||
        idOrName.includes('clamshell')
      ) {
        return true;
      }
      return false;
    }
  },

  rodilla: {
    name: 'rodilla',
    description: 'Articulación femorotibial y rotuliana (extensión y flexión de rodilla, sentadillas, zancadas, prensa, curl femoral)',
    primary_muscles: ['cuadriceps', 'isquiosurales'],
    movement_patterns: ['rodilla_dominante'],
    isPrimaryFor: (exercise: ExerciseSummary): boolean => {
      if (exercise.movement_pattern === 'rodilla_dominante' && exercise.primary_muscle !== 'pantorrillas') return true;
      if (exercise.primary_muscle === 'cuadriceps') return true;
      return false;
    },
    stresses: (exercise: ExerciseSummary): boolean => {
      if (exercise.movement_pattern === 'rodilla_dominante') return true;
      if (exercise.primary_muscle === 'cuadriceps') return true;
      const idOrName = `${exercise.id || ''} ${exercise.name || ''}`.toLowerCase();
      if (
        idOrName.includes('sentadilla') ||
        idOrName.includes('prensa') ||
        idOrName.includes('zancada') ||
        idOrName.includes('step_up') ||
        idOrName.includes('extension_cuadriceps') ||
        idOrName.includes('curl_femoral') ||
        idOrName.includes('curl_nordico') ||
        idOrName.includes('leg_curl') ||
        idOrName.includes('wall_sit') ||
        idOrName.includes('sissy')
      ) {
        return true;
      }
      return false;
    }
  },

  tobillo: {
    name: 'tobillo',
    description: 'Complejo articular del tobillo y pie (flexión plantar, dorsiflexión profunda, elevaciones de talones, saltos)',
    primary_muscles: ['pantorrillas'],
    movement_patterns: ['rodilla_dominante'],
    isPrimaryFor: (exercise: ExerciseSummary): boolean => {
      return exercise.primary_muscle === 'pantorrillas';
    },
    stresses: (exercise: ExerciseSummary): boolean => {
      if (exercise.primary_muscle === 'pantorrillas') return true;
      const idOrName = `${exercise.id || ''} ${exercise.name || ''}`.toLowerCase();
      if (
        idOrName.includes('talon') ||
        idOrName.includes('pantorrilla') ||
        idOrName.includes('calf') ||
        idOrName.includes('salto') ||
        idOrName.includes('pogo') ||
        idOrName.includes('jump') ||
        idOrName.includes('zancada') ||
        idOrName.includes('step_up') ||
        idOrName.includes('sentadilla_pistola')
      ) {
        return true;
      }
      return false;
    }
  }
};

export interface ExerciseAnatomicalProfile {
  exercise: ExerciseSummary;
  primary_joint: Joint | null;
  involved_joints: Joint[];
}

export class FatigueAdjusterService {
  /**
   * Obtiene la articulación primaria estresada por un ejercicio.
   */
  getPrimaryJoint(exercise: ExerciseSummary): Joint | null {
    const allJoints: Joint[] = [
      'hombro',
      'codo',
      'muneca',
      'columna_lumbar',
      'cadera',
      'rodilla',
      'tobillo'
    ];

    for (const joint of allJoints) {
      if (ANATOMICAL_JOINT_MATRIX[joint].isPrimaryFor(exercise)) {
        return joint;
      }
    }

    // Fallback based on primary_muscle
    if (exercise.primary_muscle === 'pecho' || exercise.primary_muscle === 'hombros') return 'hombro';
    if (exercise.primary_muscle === 'biceps' || exercise.primary_muscle === 'triceps') return 'codo';
    if (exercise.primary_muscle === 'cuadriceps') return 'rodilla';
    if (exercise.primary_muscle === 'gluteos' || exercise.primary_muscle === 'isquiosurales') return 'cadera';
    if (exercise.primary_muscle === 'pantorrillas') return 'tobillo';
    if (exercise.primary_muscle === 'core') return 'columna_lumbar';

    return null;
  }

  /**
   * Obtiene todas las articulaciones biomecánicamente involucradas/estresadas por un ejercicio.
   */
  getInvolvedJoints(exercise: ExerciseSummary): Joint[] {
    const allJoints: Joint[] = [
      'hombro',
      'codo',
      'muneca',
      'columna_lumbar',
      'cadera',
      'rodilla',
      'tobillo'
    ];

    return allJoints.filter((joint) => ANATOMICAL_JOINT_MATRIX[joint].stresses(exercise));
  }

  /**
   * Determina si un ejercicio estresa una articulación específica.
   */
  stressesJoint(exercise: ExerciseSummary, joint: Joint): boolean {
    const config = ANATOMICAL_JOINT_MATRIX[joint];
    if (!config) return false;
    return config.stresses(exercise);
  }

  /**
   * Filtra una lista de ejercicios devolviendo únicamente los que estresan la articulación indicada.
   */
  getExercisesForJoint(exercises: Exercise[], joint: Joint): Exercise[] {
    return exercises.filter((ex) => this.stressesJoint(ex, joint));
  }

  /**
   * Filtra una lista de ejercicios devolviendo únicamente los que NO estresan la articulación indicada (seguros para dolor).
   */
  getSafeExercisesForJoint(exercises: Exercise[], joint: Joint): Exercise[] {
    return exercises.filter((ex) => !this.stressesJoint(ex, joint));
  }

  /**
   * Comprueba si un ejercicio es seguro ante dolor en una articulación determinada.
   */
  isJointSafeForExercise(exercise: ExerciseSummary, joint: Joint): boolean {
    return !this.stressesJoint(exercise, joint);
  }

  /**
   * Calcula el número de series reducidas aplicando un porcentaje de reducción con redondeo seguro hacia abajo (mínimo 1 serie).
   * Fuente: RF-08, CA-08.2.
   */
  calculateReducedSets(targetSets: number, reductionPercentage: 30 | 50): number {
    const factor = reductionPercentage === 50 ? 0.50 : 0.30;
    return Math.max(1, Math.floor(targetSets * (1 - factor)));
  }

  /**
   * Calcula la carga reducida en kg aplicando un porcentaje de reducción (0% o 10%) con precisión de 1 decimal.
   * Fuente: RF-08, CA-08.2.
   */
  calculateReducedLoad(targetLoadKg: number, reductionPercentage: 0 | 10): number {
    const factor = reductionPercentage === 10 ? 0.10 : 0;
    return Math.round(targetLoadKg * (1 - factor) * 10) / 10;
  }

  /**
   * Aplica las reglas de reducción por dolor articular moderado (RF-08, CA-08.2):
   * - 1 sesión con dolor moderado: -30% volumen (series), 0% reducción de carga.
   * - 2+ sesiones consecutivas/acumuladas en la ventana: -50% volumen (series) y -10% carga en kg.
   */
  applyModeratePainAdjustment(params: ModeratePainAdjustmentParams): ModeratePainAdjustmentResult {
    const { target_sets, target_load_kg, sessions_with_moderate_pain, joint, exercise_name } = params;

    if (sessions_with_moderate_pain <= 0) {
      return {
        has_adjustment: false,
        adjusted_sets: target_sets,
        adjusted_load_kg: target_load_kg,
        volume_reduction_percentage: 0,
        load_reduction_percentage: 0,
        reason: ''
      };
    }

    if (sessions_with_moderate_pain === 1) {
      const adjusted_sets = this.calculateReducedSets(target_sets, 30);
      const adjusted_load_kg = this.calculateReducedLoad(target_load_kg, 0);
      const targetDesc = exercise_name ? ` de ${exercise_name}` : '';
      const reason = `Se redujo volumen${targetDesc} un 30% (${adjusted_sets} series): dolor moderado en ${joint}.`;

      return {
        has_adjustment: true,
        adjusted_sets,
        adjusted_load_kg,
        volume_reduction_percentage: 30,
        load_reduction_percentage: 0,
        reason
      };
    }

    // 2+ sessions with moderate pain
    const adjusted_sets = this.calculateReducedSets(target_sets, 50);
    const adjusted_load_kg = this.calculateReducedLoad(target_load_kg, 10);
    const targetDesc = exercise_name ? ` en ${exercise_name}` : '';
    const reason = `Se redujo volumen un 50% (${adjusted_sets} series) y carga un 10% (${adjusted_load_kg}kg)${targetDesc}: dolor moderado persistente en ${joint}.`;

    return {
      has_adjustment: true,
      adjusted_sets,
      adjusted_load_kg,
      volume_reduction_percentage: 50,
      load_reduction_percentage: 10,
      reason
    };
  }

  /**
   * Cuenta las sesiones distintas en un historial de dolor que reportaron una articulación específica (y opcionalmente intensidad).
   */
  countSessionsWithPain(
    painHistory: Array<{ session_id?: string; joint: Joint; intensity?: PainIntensity }>,
    joint: Joint,
    intensity?: PainIntensity
  ): number {
    const matchingSessions = new Set<string>();
    let fallbackCount = 0;

    for (const record of painHistory) {
      if (record.joint === joint && (!intensity || record.intensity === intensity)) {
        if (record.session_id) {
          matchingSessions.add(record.session_id);
        } else {
          fallbackCount++;
        }
      }
    }

    return matchingSessions.size > 0 ? matchingSessions.size : fallbackCount;
  }
  /**
   * Compara dos intensidades de dolor (D-20).
   * Devuelve > 0 si a > b, < 0 si a < b, 0 si son iguales.
   */
  comparePainIntensity(a: PainIntensity, b: PainIntensity): number {
    const order: Record<PainIntensity, number> = {
      leve: 1,
      moderada: 2,
      severa: 3
    };
    return (order[a] || 0) - (order[b] || 0);
  }

  /**
   * Resuelve el mapa de severidad máxima por articulación aplicando la regla D-20 (prevalece la más severa).
   */
  resolveJointSeverities(painReports: JointPainReportItem[]): Map<Joint, PainIntensity> {
    const severities = new Map<Joint, PainIntensity>();

    for (const report of painReports) {
      const current = severities.get(report.joint);
      if (!current || this.comparePainIntensity(report.intensity, current) > 0) {
        severities.set(report.joint, report.intensity);
      }
    }

    return severities;
  }

  /**
   * Maneja el dolor severo para un ejercicio (CA-08.1):
   * - Excluye el ejercicio si estresa alguna de las articulaciones con dolor severo.
   * - Busca una alternativa compatible con el equipamiento que NO estrese ninguna articulación dolorosa.
   * - Si no hay alternativa, omite el ejercicio.
   */
  handleSeverePain(params: SeverePainExclusionParams): SeverePainAdjustmentResult {
    const { exercise, target_sets, target_load_kg, severe_joints, available_alternatives = [] } = params;

    const affectedJoints = severe_joints.filter((j) => this.stressesJoint(exercise, j));
    if (affectedJoints.length === 0) {
      return {
        is_excluded: false,
        is_substituted: false,
        action: 'none',
        original_exercise: exercise,
        adjusted_sets: target_sets,
        adjusted_load_kg: target_load_kg,
        notices: []
      };
    }

    const primaryAffected = affectedJoints[0];

    // Buscar alternativa segura que NO estrese ninguna articulación severamente afectada
    const safeAlternative = available_alternatives.find((alt) =>
      severe_joints.every((j) => this.isJointSafeForExercise(alt, j))
    );

    if (safeAlternative) {
      return {
        is_excluded: false,
        is_substituted: true,
        action: 'substituted',
        original_exercise: exercise,
        substituted_exercise: safeAlternative,
        adjusted_sets: target_sets,
        adjusted_load_kg: target_load_kg,
        notices: [
          `Se reemplazó ${exercise.name} por ${safeAlternative.name}: dolor severo en ${primaryAffected}.`
        ]
      };
    }

    // Sin alternativa segura -> Omitir ejercicio
    return {
      is_excluded: true,
      is_substituted: false,
      action: 'excluded',
      original_exercise: exercise,
      adjusted_sets: 0,
      adjusted_load_kg: 0,
      notices: [
        `Se omitió ${exercise.name}: dolor severo en ${primaryAffected}, sin alternativa disponible.`
      ]
    };
  }

  /**
   * Cuenta las sesiones consecutivas recientes con fatiga alta (≥ 4/5).
   * Fuente: RF-08, CA-08.4.
   */
  countConsecutiveHighFatigue(fatigueHistory: FatigueHistoryItem[]): number {
    let consecutiveCount = 0;

    for (const item of fatigueHistory) {
      const level = typeof item === 'number' ? item : item.fatigue_level;
      if (level >= 4) {
        consecutiveCount++;
      } else {
        break; // Detener conteo si se rompe la racha consecutiva
      }
    }

    return consecutiveCount;
  }

  /**
   * Determina si se gatilla una descarga reactiva por fatiga general alta sostenida (≥ 4 en 2+ sesiones consecutivas).
   * Fuente: RF-08, CA-08.4.
   */
  isReactiveDeloadTriggered(fatigueHistory: FatigueHistoryItem[]): boolean {
    return this.countConsecutiveHighFatigue(fatigueHistory) >= 2;
  }

  /**
   * Aplica la descarga reactiva reduciendo el volumen en un 40% (series) ante fatiga alta sostenida (RF-08, CA-08.4).
   */
  applyReactiveDeload(params: ReactiveDeloadParams): ReactiveDeloadResult {
    const { exercises, fatigue_history } = params;
    const consecutiveCount = this.countConsecutiveHighFatigue(fatigue_history);
    const isReactiveDeload = consecutiveCount >= 2;

    if (!isReactiveDeload) {
      return {
        is_reactive_deload: false,
        consecutive_high_fatigue_count: consecutiveCount,
        exercises: exercises.map((item) => ({
          assignment_id: item.assignment_id,
          exercise: item.exercise,
          original_sets: item.target_sets,
          adjusted_sets: item.target_sets,
          target_load_kg: item.target_load_kg,
          target_rir: item.target_rir ?? 2
        })),
        volume_reduction_percentage: 0,
        notices: []
      };
    }

    const notices: string[] = [
      `Fatiga alta sostenida (${consecutiveCount} sesiones con nivel ≥ 4): se programa descarga reactiva reduciendo volumen en un 40%.`
    ];

    const adjustedExercises: ReactiveDeloadExerciseOutput[] = exercises.map((item) => {
      const adjusted_sets = Math.max(1, Math.floor(item.target_sets * 0.60));
      return {
        assignment_id: item.assignment_id,
        exercise: item.exercise,
        original_sets: item.target_sets,
        adjusted_sets,
        target_load_kg: item.target_load_kg,
        target_rir: (item.target_rir ?? 2) + 1
      };
    });

    return {
      is_reactive_deload: true,
      consecutive_high_fatigue_count: consecutiveCount,
      exercises: adjustedExercises,
      volume_reduction_percentage: 40,
      notices
    };
  }

  /**
   * Ajusta una sesión completa ante reportes de dolor articular y fatiga alta (RF-08, CA-08.1, CA-08.2, CA-08.3, CA-08.4, CA-08.5, D-20):
   * - D-20: Prevalece la intensidad más severa por articulación.
   * - Severa: Exclusión o sustitución biomecánicamente segura.
   * - Moderada: Reducción de volumen (-30% en 1ª sesión, -50% y -10% carga en 2ª+ sesión).
   * - Leve: Mantenimiento y registro de seguimiento.
   * - CA-08.4: Descarga reactiva inmediata (-40% volumen) ante fatiga general ≥ 4 por 2+ sesiones.
   * - CA-08.5: Advertencia si un patrón de movimiento queda completamente omitido.
   * - Descanso total sugerido si todos los ejercicios de la sesión quedan excluidos.
   */
  adjustSessionForPain(params: SessionPlanAdjustmentParams): AdjustedSessionPlanResult {
    const { exercises, pain_reports, fatigue_history = [], catalog_alternatives, available_equipment_ids } = params;

    const jointSeverities = this.resolveJointSeverities(pain_reports);
    const notices: string[] = [];

    // Notificaciones de seguimiento para dolor leve (CA-08.3)
    for (const [joint, intensity] of jointSeverities.entries()) {
      if (intensity === 'leve') {
        notices.push(`Dolor leve en ${joint}: registrado para seguimiento sin cambios de carga.`);
      }
    }

    const severeJoints = Array.from(jointSeverities.entries())
      .filter(([_, intensity]) => intensity === 'severa')
      .map(([joint]) => joint);

    const isReactiveDeload = this.isReactiveDeloadTriggered(fatigue_history);
    if (isReactiveDeload) {
      notices.push('Fatiga alta sostenida (2+ sesiones con nivel ≥ 4): se propone descarga reactiva (reducción del 40% de volumen).');
    }

    const adjustedExercises: AdjustedExerciseItem[] = [];

    for (const item of exercises) {
      const { exercise, target_sets, target_load_kg, assignment_id } = item;

      // Buscar articulaciones estresadas por este ejercicio que tengan dolor reportado
      const stressedPainJoints = Array.from(jointSeverities.entries()).filter(([joint]) =>
        this.stressesJoint(exercise, joint)
      );

      // Si no hay dolor en articulaciones involucradas
      if (stressedPainJoints.length === 0) {
        const finalSets = isReactiveDeload ? Math.max(1, Math.floor(target_sets * 0.60)) : target_sets;
        adjustedExercises.push({
          assignment_id,
          exercise,
          original_exercise: exercise,
          target_sets: finalSets,
          target_load_kg,
          is_omitted: false,
          is_substituted: false,
          notices: []
        });
        continue;
      }

      // Prevalece la máxima severidad entre las articulaciones estresadas por este ejercicio
      const highestSeverity = stressedPainJoints.reduce<PainIntensity>(
        (max, [_, intensity]) => (this.comparePainIntensity(intensity, max) > 0 ? intensity : max),
        'leve'
      );
      const affectedJoint = stressedPainJoints.find(([_, intensity]) => intensity === highestSeverity)![0];

      if (highestSeverity === 'severa') {
        let candidateAlternatives: Exercise[] = [];
        if (catalog_alternatives instanceof Map) {
          candidateAlternatives = catalog_alternatives.get(exercise.id) || [];
        } else if (typeof catalog_alternatives === 'function') {
          const res = catalog_alternatives(exercise.id);
          if (Array.isArray(res)) candidateAlternatives = res;
        }

        // Filtrar por equipamiento disponible si se especificó
        if (available_equipment_ids && available_equipment_ids.length > 0) {
          candidateAlternatives = candidateAlternatives.filter((alt) =>
            available_equipment_ids.includes(alt.equipment_id)
          );
        }

        const severeResult = this.handleSeverePain({
          exercise,
          target_sets,
          target_load_kg,
          severe_joints: severeJoints,
          available_alternatives: candidateAlternatives
        });

        if (severeResult.is_substituted && severeResult.substituted_exercise) {
          const finalSets = isReactiveDeload
            ? Math.max(1, Math.floor(severeResult.adjusted_sets * 0.60))
            : severeResult.adjusted_sets;

          adjustedExercises.push({
            assignment_id,
            exercise: severeResult.substituted_exercise,
            original_exercise: exercise,
            target_sets: finalSets,
            target_load_kg: severeResult.adjusted_load_kg,
            is_omitted: false,
            is_substituted: true,
            pain_intensity_applied: 'severa',
            affected_joint: affectedJoint,
            notices: severeResult.notices
          });
          notices.push(...severeResult.notices);
        } else {
          // Omitido
          adjustedExercises.push({
            assignment_id,
            exercise,
            original_exercise: exercise,
            target_sets: 0,
            target_load_kg: 0,
            is_omitted: true,
            is_substituted: false,
            pain_intensity_applied: 'severa',
            affected_joint: affectedJoint,
            notices: severeResult.notices
          });
          notices.push(...severeResult.notices);
        }
      } else if (highestSeverity === 'moderada') {
        const moderateSessionsCount = this.countSessionsWithPain(pain_reports, affectedJoint, 'moderada');
        const moderateResult = this.applyModeratePainAdjustment({
          target_sets,
          target_load_kg,
          sessions_with_moderate_pain: Math.max(1, moderateSessionsCount),
          joint: affectedJoint,
          exercise_name: exercise.name
        });

        const finalSets = isReactiveDeload
          ? Math.max(1, Math.floor(moderateResult.adjusted_sets * 0.60))
          : moderateResult.adjusted_sets;

        adjustedExercises.push({
          assignment_id,
          exercise,
          original_exercise: exercise,
          target_sets: finalSets,
          target_load_kg: moderateResult.adjusted_load_kg,
          is_omitted: false,
          is_substituted: false,
          pain_intensity_applied: 'moderada',
          affected_joint: affectedJoint,
          notices: moderateResult.reason ? [moderateResult.reason] : []
        });
        if (moderateResult.reason) {
          notices.push(moderateResult.reason);
        }
      } else {
        // Leve
        const finalSets = isReactiveDeload ? Math.max(1, Math.floor(target_sets * 0.60)) : target_sets;
        adjustedExercises.push({
          assignment_id,
          exercise,
          original_exercise: exercise,
          target_sets: finalSets,
          target_load_kg,
          is_omitted: false,
          is_substituted: false,
          pain_intensity_applied: 'leve',
          affected_joint: affectedJoint,
          notices: []
        });
      }
    }

    // CA-08.5: Evaluación de patrones de movimiento comprometidos
    const patterns: MovementPattern[] = ['empuje', 'tiron', 'rodilla_dominante', 'cadera_dominante', 'core'];
    const excludedPatterns: MovementPattern[] = [];

    for (const pattern of patterns) {
      const patternExercises = adjustedExercises.filter(
        (item) => item.original_exercise.movement_pattern === pattern
      );
      if (patternExercises.length > 0 && patternExercises.every((item) => item.is_omitted)) {
        excludedPatterns.push(pattern);
        notices.push(`Sesión reducida: se excluyó ${pattern} por dolor articular reportado.`);
      }
    }

    const totalRestRecommended = adjustedExercises.length > 0 && adjustedExercises.every((item) => item.is_omitted);
    if (totalRestRecommended) {
      notices.push('No quedan ejercicios viables. Se sugiere descanso total hoy.');
    }

    return {
      exercises: adjustedExercises,
      notices,
      excluded_patterns: excludedPatterns,
      total_rest_recommended: totalRestRecommended,
      reactive_deload_recommended: isReactiveDeload
    };
  }
}

export type FatigueHistoryItem = number | { fatigue_level: number; created_at?: string | Date; session_id?: string };

export interface ReactiveDeloadExerciseInput {
  assignment_id?: string;
  exercise: Exercise;
  target_sets: number;
  target_load_kg: number;
  target_reps?: number;
  target_rir?: number;
}

export interface ReactiveDeloadExerciseOutput {
  assignment_id?: string;
  exercise: Exercise;
  original_sets: number;
  adjusted_sets: number;
  target_load_kg: number;
  target_rir: number;
}

export interface ReactiveDeloadParams {
  exercises: ReactiveDeloadExerciseInput[];
  fatigue_history: FatigueHistoryItem[];
}

export interface ReactiveDeloadResult {
  is_reactive_deload: boolean;
  consecutive_high_fatigue_count: number;
  exercises: ReactiveDeloadExerciseOutput[];
  volume_reduction_percentage: number;
  notices: string[];
}

export interface JointPainReportItem {
  joint: Joint;
  side?: BodySide;
  intensity: PainIntensity;
  session_id?: string;
  created_at?: string | Date;
}

export interface SeverePainExclusionParams {
  exercise: Exercise;
  target_sets: number;
  target_load_kg: number;
  severe_joints: Joint[];
  available_alternatives?: Exercise[];
  equipment_ids?: string[];
}

export interface SeverePainAdjustmentResult {
  is_excluded: boolean;
  is_substituted: boolean;
  action: 'none' | 'substituted' | 'excluded';
  original_exercise: Exercise;
  substituted_exercise?: Exercise;
  adjusted_sets: number;
  adjusted_load_kg: number;
  notices: string[];
  warning?: string;
}

export interface SessionPlanAdjustmentParams {
  exercises: Array<{
    assignment_id?: string;
    exercise: Exercise;
    target_sets: number;
    target_load_kg: number;
    target_reps?: number;
    target_rir?: number;
    order_in_session?: number;
  }>;
  pain_reports: JointPainReportItem[];
  fatigue_history?: FatigueHistoryItem[];
  catalog_alternatives?:
    | Map<string, Exercise[]>
    | ((exerciseId: string) => Promise<Exercise[]> | Exercise[]);
  available_equipment_ids?: string[];
  recent_sessions_count?: number;
}

export interface AdjustedExerciseItem {
  assignment_id?: string;
  exercise: Exercise;
  original_exercise: Exercise;
  target_sets: number;
  target_load_kg: number;
  is_omitted: boolean;
  is_substituted: boolean;
  pain_intensity_applied?: PainIntensity;
  affected_joint?: Joint;
  notices: string[];
}

export interface AdjustedSessionPlanResult {
  exercises: AdjustedExerciseItem[];
  notices: string[];
  excluded_patterns: MovementPattern[];
  total_rest_recommended: boolean;
  reactive_deload_recommended?: boolean;
}

export interface ModeratePainAdjustmentParams {
  target_sets: number;
  target_load_kg: number;
  sessions_with_moderate_pain: number;
  joint: Joint;
  exercise_name?: string;
}

export interface ModeratePainAdjustmentResult {
  has_adjustment: boolean;
  adjusted_sets: number;
  adjusted_load_kg: number;
  volume_reduction_percentage: number;
  load_reduction_percentage: number;
  reason: string;
}

export const fatigueAdjusterService = new FatigueAdjusterService();



