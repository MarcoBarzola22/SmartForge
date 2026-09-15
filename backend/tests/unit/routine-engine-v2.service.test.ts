import { describe, it, expect } from 'vitest';
import {
  RoutineEngineV2Service,
  BILATERAL_SET_SECONDS,
  UNILATERAL_SET_SECONDS,
  DME_MIN_SETS,
  DME_MAX_SETS,
  DME_NOTE,
  PRUNING_NOTE,
  PRIMARY_COMPOUND_MIN_SETS,
  SECONDARY_COMPOUND_MIN_SETS,
  isUnilateralExercise,
  type ExercisePlannedInput,
  type PlannedSession
} from '../../src/services/routine-engine-v2.service.js';

describe('TASK-25: RoutineEngineV2Service Unit Tests (RF-03, RF-04, Constitución Art. 4)', () => {
  const service = new RoutineEngineV2Service();

  describe('1. Matriz de bloques de tiempo y recomendación dinámica N (RF-03 CA-03.2, CA-03.3, CA-03.4)', () => {
    it('debe exponer exactamente los 6 bloques uniformes estandarizados por el backend', () => {
      const blocks = service.getTimeBlockConfig();
      expect(blocks).toHaveLength(6);

      const durations = blocks.map((b) => b.duration_minutes);
      expect(durations).toEqual([30, 45, 60, 75, 90, 120]);
    });

    it('cada bloque debe definir rangos mínimo, máximo y recomendación N coherentes', () => {
      const blocks = service.getTimeBlockConfig();

      for (const block of blocks) {
        expect(block.min_exercises).toBeGreaterThanOrEqual(2);
        expect(block.max_exercises).toBeLessThanOrEqual(7);
        expect(block.min_exercises).toBeLessThanOrEqual(block.recommended_exercises);
        expect(block.recommended_exercises).toBeLessThanOrEqual(block.max_exercises);
      }

      // Verificación de valores exactos según RF-03 / RF-04
      expect(service.getTimeBlockByDuration(30)).toEqual({
        duration_minutes: 30,
        min_exercises: 2,
        max_exercises: 3,
        recommended_exercises: 2
      });
      expect(service.getTimeBlockByDuration(60)).toEqual({
        duration_minutes: 60,
        min_exercises: 2,
        max_exercises: 5,
        recommended_exercises: 4
      });
      expect(service.getTimeBlockByDuration(90)).toEqual({
        duration_minutes: 90,
        min_exercises: 3,
        max_exercises: 7,
        recommended_exercises: 6
      });
      expect(service.getTimeBlockByDuration(120)).toEqual({
        duration_minutes: 120,
        min_exercises: 4,
        max_exercises: 7,
        recommended_exercises: 7
      });
    });

    it('retorna undefined para duraciones no soportadas', () => {
      expect(service.getTimeBlockByDuration(40)).toBeUndefined();
      expect(service.getTimeBlockByDuration(100)).toBeUndefined();
    });
  });

  describe('2. Detección biomecánica de ejercicios unilaterales (Factor 1.8x) (RF-04 CA-04.1)', () => {
    it('debe detectar ejercicios unilaterales por flag booleano is_unilateral o isUnilateral', () => {
      expect(isUnilateralExercise({ id: 'ex1', is_unilateral: true })).toBe(true);
      expect(isUnilateralExercise({ id: 'ex2', isUnilateral: true })).toBe(true);
      expect(isUnilateralExercise({ id: 'ex3', is_unilateral: false })).toBe(false);
    });

    it('debe detectar ejercicios unilaterales por coincidencia léxica en id o nombre', () => {
      expect(isUnilateralExercise({ id: 'split_squat_unilateral', name: 'Sentadilla búlgara' })).toBe(true);
      expect(isUnilateralExercise({ id: 'db_row_1_arm', name: 'Remo con mancuerna a una mano' })).toBe(true);
      expect(isUnilateralExercise({ id: 'curl_1_brazo', name: 'Curl a 1 mano' })).toBe(true);
      expect(isUnilateralExercise({ id: 'leg_press_unilateral', name: 'Prensa a 1 pierna' })).toBe(true);
      expect(isUnilateralExercise({ id: 'pistol_squat', name: 'Pistol squat' })).toBe(true);
      expect(isUnilateralExercise({ id: 'barbell_bench_press', name: 'Press banca con barra' })).toBe(false);
    });

    it('los parámetros biomecánicos deben reflejar el factor 1.8x para unilaterales (80s vs 45s)', () => {
      expect(UNILATERAL_SET_SECONDS).toBe(80);
      expect(BILATERAL_SET_SECONDS).toBe(45);
      expect(UNILATERAL_SET_SECONDS / BILATERAL_SET_SECONDS).toBeCloseTo(1.78, 1);
    });
  });

  describe('3. Estimación y viabilidad temporal en semana pico (RF-04 CA-04.1)', () => {
    it('debe calcular la sesión como viable cuando el tiempo estimado entra en el bloque asignado', () => {
      // 60 min, 3 ejercicios moderados (1 compuesto bilateral 3 series, 2 aislados 3 series)
      const exercises: ExercisePlannedInput[] = [
        { id: 'bench_press', is_compound: true, is_unilateral: false, peakSets: 3 },
        { id: 'cable_flyes', is_compound: false, is_unilateral: false, peakSets: 3 },
        { id: 'triceps_pushdown', is_compound: false, is_unilateral: false, peakSets: 3 }
      ];

      const result = service.validateSessionFeasibility(60, exercises, true);

      expect(result.isFeasible).toBe(true);
      expect(result.deficitMinutes).toBe(0);
      expect(result.estimatedMinutes).toBeLessThanOrEqual(60);
      expect(result.availableMinutes).toBe(60);
    });

    it('debe calcular la sesión como inviable y reportar déficit cuando sobrepasa el tiempo', () => {
      // 30 min con 4 ejercicios compuestos en semana pico (4 series c/u)
      const exercises: ExercisePlannedInput[] = [
        { id: 'squat', is_compound: true, is_unilateral: false, peakSets: 4 },
        { id: 'bench', is_compound: true, is_unilateral: false, peakSets: 4 },
        { id: 'deadlift', is_compound: true, is_unilateral: false, peakSets: 4 },
        { id: 'overhead_press', is_compound: true, is_unilateral: false, peakSets: 4 }
      ];

      const result = service.validateSessionFeasibility(30, exercises, true);

      expect(result.isFeasible).toBe(false);
      expect(result.deficitMinutes).toBeGreaterThan(0);
      expect(result.estimatedMinutes).toBeGreaterThan(30);
      expect(result.reason).toMatch(/requiere \d+ min para series y pausas fisiológicas/i);
      expect(result.suggestion).toMatch(/recomendamos un máximo de \d+ a \d+ ejercicios/i);
    });

    it('debe reflejar mayor demanda de tiempo para ejercicios unilaterales que bilaterales', () => {
      const bilateralEx: ExercisePlannedInput[] = [
        { id: 'leg_press', is_compound: true, is_unilateral: false, peakSets: 4 }
      ];
      const unilateralEx: ExercisePlannedInput[] = [
        { id: 'bulgarian_split_squat', is_compound: true, is_unilateral: true, peakSets: 4 }
      ];

      const resBilateral = service.validateSessionFeasibility(45, bilateralEx, true);
      const resUnilateral = service.validateSessionFeasibility(45, unilateralEx, true);

      expect(resUnilateral.estimatedMinutes).toBeGreaterThan(resBilateral.estimatedMinutes);
    });
  });

  describe('4. Bloqueo con mensaje pedagógico ante selecciones manuales inviables (RF-04 CA-04.2, CA-04.3)', () => {
    it('debe bloquear selecciones manuales que superan max_exercises del bloque con mensaje pedagógico', () => {
      // 30 min con 4 o 5 ejercicios (máximo para 30 min es 3)
      const check4 = service.validateSelectionFeasibility(30, 4);
      expect(check4.isFeasible).toBe(false);
      expect(check4.reason).toMatch(/excede el presupuesto del bloque de 30 minutos/i);
      expect(check4.suggestion).toMatch(/recomendamos un máximo de 2 a 3 ejercicios/i);

      const check5 = service.validateSelectionFeasibility(30, 5);
      expect(check5.isFeasible).toBe(false);
      expect(check5.suggestion).toContain('2 a 3 ejercicios');
    });

    it('debe permitir selecciones dentro del rango permitido del bloque', () => {
      expect(service.validateSelectionFeasibility(30, 2).isFeasible).toBe(true);
      expect(service.validateSelectionFeasibility(30, 3).isFeasible).toBe(true);
      expect(service.validateSelectionFeasibility(45, 4).isFeasible).toBe(true);
      expect(service.validateSelectionFeasibility(60, 5).isFeasible).toBe(true);
      expect(service.validateSelectionFeasibility(90, 6).isFeasible).toBe(true);
      expect(service.validateSelectionFeasibility(120, 7).isFeasible).toBe(true);
    });
  });

  describe('5. Garantía matemática: La opción "Recomendado por SmartForge" es SIEMPRE viable (RF-03 CA-03.4)', () => {
    it('la cantidad recomendada de ejercicios N es viable en semana pico para TODOS los 6 bloques fijos', () => {
      const blocks = service.getTimeBlockConfig();

      for (const block of blocks) {
        const N = block.recommended_exercises;

        // Construir una sesión típica con N ejercicios (1 compuesto principal + balance compuesto/aislamiento)
        const exercises: ExercisePlannedInput[] = [];
        for (let i = 0; i < N; i++) {
          const isCompound = i === 0 || i % 2 === 0;
          exercises.push({
            id: `exercise_${i + 1}`,
            name: `Ejercicio ${i + 1}`,
            is_compound: isCompound,
            is_unilateral: false,
            peakSets: 3
          });
        }

        const feasibility = service.validateSessionFeasibility(block.duration_minutes, exercises, true);

        expect(
          feasibility.isFeasible,
          `El bloque de ${block.duration_minutes} min con N=${N} recomendados debe ser viable.`
        ).toBe(true);
        expect(feasibility.deficitMinutes).toBe(0);
      }
    });
  });

  describe('6. Reemplazo de ejercicios con reducción a piso de 2 series (RF-04 CA-04.5)', () => {
    it('debe reducir series del candidato a 2 si reemplazar por variante unilateral desborda el tiempo', () => {
      // Sesión de 45 min con 3 ejercicios al límite
      const currentExercises: ExercisePlannedInput[] = [
        { id: 'bench', name: 'Press banca', is_compound: true, is_unilateral: false, peakSets: 3 },
        { id: 'incline_db', name: 'Press inclinado', is_compound: true, is_unilateral: false, peakSets: 3 },
        { id: 'pushdown', name: 'Extensión tríceps', is_compound: false, is_unilateral: false, peakSets: 3 }
      ];

      // Candidato unilateral con alta demanda temporal
      const candidate: ExercisePlannedInput = {
        id: 'db_fly_unilateral',
        name: 'Aperturas a una mano',
        is_compound: false,
        is_unilateral: true,
        peakSets: 3
      };

      const swapResult = service.validateExerciseSwapFeasibility({
        durationMinutes: 45,
        currentExercises,
        replacingExerciseId: 'pushdown',
        candidateExercise: candidate
      });

      // Debe permitir el swap aplicando reducción de series o confirmando viabilidad
      expect(swapResult.canSwap).toBe(true);
      if (swapResult.setsReduced) {
        expect(swapResult.adjustedCandidateSets).toBe(2);
      }
    });

    it('debe rechazar el reemplazo si incluso con el piso de 2 series excede el tiempo disponible', () => {
      // Sesión extremadamente congestionada en 30 min (3 ejercicios pesados)
      const currentExercises: ExercisePlannedInput[] = [
        { id: 'squat', is_compound: true, is_unilateral: false, peakSets: 4 },
        { id: 'bench', is_compound: true, is_unilateral: false, peakSets: 4 },
        { id: 'deadlift', is_compound: true, is_unilateral: false, peakSets: 4 }
      ];

      // Reemplazo por unilateral extremo
      const candidate: ExercisePlannedInput = {
        id: 'bulgarian_split_squat',
        name: 'Sentadilla búlgara a una pierna',
        is_compound: true,
        is_unilateral: true,
        peakSets: 4
      };

      const swapResult = service.validateExerciseSwapFeasibility({
        durationMinutes: 30,
        currentExercises,
        replacingExerciseId: 'deadlift',
        candidateExercise: candidate
      });

      expect(swapResult.canSwap).toBe(false);
      expect(swapResult.message).toMatch(/excede el tiempo disponible/i);
    });
  });

  describe('7. Dosis Mínima Efectiva (DME: 6–8 series) ante bloques reducidos (RF-04 CA-04.4)', () => {
    it('debe ajustar series a DME (6–8 series) y fijar RIR 1-2 cuando tiempo <= 45 min y días <= 3', () => {
      const plan: PlannedSession[] = [
        {
          name: 'Sesión 1',
          exercises: [
            { id: 'press', muscle: 'pecho', targetSets: 5, is_compound: true },
            { id: 'flyes', muscle: 'pecho', targetSets: 5, is_compound: false }
          ]
        }
      ];

      const dmeResult = service.applyDME(plan, {
        durationMinutes: 30,
        availableDays: 2
      });

      expect(dmeResult.isDmeActive).toBe(true);
      expect(dmeResult.targetRirRange).toEqual([1, 2]);
      expect(dmeResult.note).toBe(DME_NOTE);

      // Total de series de pecho ajustado dentro de 6 a 8
      let totalSets = 0;
      for (const session of dmeResult.weeklyPlan) {
        for (const ex of session.exercises) {
          if (ex.muscle === 'pecho') {
            totalSets += ex.targetSets;
            expect(ex.targetRir).toBe(2);
          }
        }
      }
      expect(totalSets).toBeLessThanOrEqual(DME_MAX_SETS);
      expect(totalSets).toBeGreaterThanOrEqual(DME_MIN_SETS);
    });

    it('no debe activar DME cuando la disponibilidad de tiempo y días es suficiente (ej. 60m, 4 días)', () => {
      const plan: PlannedSession[] = [
        {
          name: 'Sesión 1',
          exercises: [{ id: 'press', muscle: 'pecho', targetSets: 4, is_compound: true }]
        }
      ];

      const dmeResult = service.applyDME(plan, {
        durationMinutes: 60,
        availableDays: 4
      });

      expect(dmeResult.isDmeActive).toBe(false);
      expect(dmeResult.note).toBeUndefined();
    });
  });

  describe('8. Poda jerárquica ante el techo de seguridad de 24 series/músculo/semana (RF-04 CA-04.6)', () => {
    it('NO debe podar cuando el volumen semanal es <= 24 series', () => {
      const plan: PlannedSession[] = [
        {
          name: 'Sesión 1',
          exercises: [
            { id: 'bench', muscle: 'pecho', is_compound: true, is_primary_compound: true, targetSets: 4 },
            { id: 'incline', muscle: 'pecho', is_compound: true, is_secondary_compound: true, targetSets: 4 },
            { id: 'flyes', muscle: 'pecho', is_compound: false, targetSets: 4 }
          ]
        },
        {
          name: 'Sesión 2',
          exercises: [
            { id: 'dips', muscle: 'pecho', is_compound: true, is_secondary_compound: true, targetSets: 4 }
          ]
        }
      ];

      // Total = 4 + 4 + 4 + 4 = 16 series <= 24
      const result = service.applyHierarchicalPruning(plan, 'pecho');

      expect(result.wasPruned).toBe(false);
      expect(result.finalSets).toBe(16);
      expect(result.note).toBeUndefined();
    });

    it('debe podar ejercicios de aislamiento PRIMERO (hasta el piso de 2 series) cuando volumen > 24', () => {
      // 7 sesiones con 4 series de pecho cada una = 28 series (exceso de 4)
      const plan: PlannedSession[] = [
        {
          name: 'S1',
          exercises: [{ id: 'bench', muscle: 'pecho', is_compound: true, is_primary_compound: true, targetSets: 4 }]
        },
        {
          name: 'S2',
          exercises: [{ id: 'incline_db', muscle: 'pecho', is_compound: true, is_secondary_compound: true, targetSets: 4 }]
        },
        {
          name: 'S3',
          exercises: [{ id: 'flyes_1', muscle: 'pecho', is_compound: false, targetSets: 4 }]
        },
        {
          name: 'S4',
          exercises: [{ id: 'flyes_2', muscle: 'pecho', is_compound: false, targetSets: 4 }]
        },
        {
          name: 'S5',
          exercises: [{ id: 'flyes_3', muscle: 'pecho', is_compound: false, targetSets: 4 }]
        },
        {
          name: 'S6',
          exercises: [{ id: 'dips', muscle: 'pecho', is_compound: true, is_secondary_compound: true, targetSets: 4 }]
        },
        {
          name: 'S7',
          exercises: [{ id: 'crossover', muscle: 'pecho', is_compound: false, targetSets: 4 }]
        }
      ];

      const result = service.applyHierarchicalPruning(plan, 'pecho');

      expect(result.wasPruned).toBe(true);
      expect(result.originalSets).toBe(28);
      expect(result.finalSets).toBe(24);
      expect(result.note).toBe(PRUNING_NOTE);

      // El compuesto principal (bench) debe permanecer intacto en 4 series
      const benchEx = result.weeklyPlan[0]?.exercises[0];
      expect(benchEx?.targetSets).toBe(4);
    });

    it('debe podar accesorios secundarios si tras podar aislamiento persiste el exceso sobre 24 series', () => {
      // 8 sesiones de 4 series = 32 series (solo 1 de aislamiento = 4 series podable a 2, quedan 30)
      const plan: PlannedSession[] = [
        {
          name: 'S1',
          exercises: [{ id: 'bench', muscle: 'pecho', is_compound: true, is_primary_compound: true, targetSets: 4 }]
        },
        {
          name: 'S2',
          exercises: [{ id: 'flyes', muscle: 'pecho', is_compound: false, targetSets: 4 }] // Se poda de 4 a 2
        },
        {
          name: 'S3',
          exercises: [{ id: 'incline_barbell', muscle: 'pecho', is_compound: true, is_secondary_compound: true, targetSets: 4 }]
        },
        {
          name: 'S4',
          exercises: [{ id: 'incline_db', muscle: 'pecho', is_compound: true, is_secondary_compound: true, targetSets: 4 }]
        },
        {
          name: 'S5',
          exercises: [{ id: 'dips', muscle: 'pecho', is_compound: true, is_secondary_compound: true, targetSets: 4 }]
        },
        {
          name: 'S6',
          exercises: [{ id: 'decline_press', muscle: 'pecho', is_compound: true, is_secondary_compound: true, targetSets: 4 }]
        },
        {
          name: 'S7',
          exercises: [{ id: 'pushups', muscle: 'pecho', is_compound: true, is_secondary_compound: true, targetSets: 4 }]
        },
        {
          name: 'S8',
          exercises: [{ id: 'machine_press', muscle: 'pecho', is_compound: true, is_secondary_compound: true, targetSets: 4 }]
        }
      ];

      const result = service.applyHierarchicalPruning(plan, 'pecho');

      expect(result.wasPruned).toBe(true);
      expect(result.finalSets).toBe(24);

      // El compuesto principal NUNCA se poda por debajo de 3 series (aquí permanece en 4)
      const benchEx = result.weeklyPlan[0]?.exercises[0];
      expect(benchEx?.targetSets).toBeGreaterThanOrEqual(PRIMARY_COMPOUND_MIN_SETS);

      // Los secundarios respetan el piso de 2 series
      for (let i = 2; i < result.weeklyPlan.length; i++) {
        const secEx = result.weeklyPlan[i]?.exercises[0];
        expect(secEx?.targetSets).toBeGreaterThanOrEqual(SECONDARY_COMPOUND_MIN_SETS);
      }
    });

    it('applyHierarchicalPruningAllMuscles debe procesar y estabilizar todos los grupos musculares que superen 24 series', () => {
      const plan: PlannedSession[] = [
        {
          name: 'S1',
          exercises: [
            { id: 'bench', muscle: 'pecho', is_compound: true, is_primary_compound: true, targetSets: 14 },
            { id: 'flyes', muscle: 'pecho', is_compound: false, targetSets: 14 }, // Pecho = 28
            { id: 'squat', muscle: 'cuadriceps', is_compound: true, is_primary_compound: true, targetSets: 14 },
            { id: 'leg_ext', muscle: 'cuadriceps', is_compound: false, targetSets: 14 } // Cuadriceps = 28
          ]
        }
      ];

      const multiResult = service.applyHierarchicalPruningAllMuscles(plan);

      expect(multiResult.wasPruned).toBe(true);
      expect(multiResult.prunedMuscles).toContain('pecho');
      expect(multiResult.prunedMuscles).toContain('cuadriceps');
      expect(multiResult.note).toBe(PRUNING_NOTE);
    });
  });
});
