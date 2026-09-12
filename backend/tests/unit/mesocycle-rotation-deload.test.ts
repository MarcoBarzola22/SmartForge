import { describe, it, expect } from 'vitest';
import {
  MesocycleRotationService,
  mesocycleRotationService,
  DELOAD_VOLUME_FACTOR,
  DELOAD_LOAD_FACTOR,
  DELOAD_RIR_INCREMENT
} from '../../src/services/mesocycle-rotation.service.js';
import type {
  ExerciseAssignment,
  SessionPlan,
  WeekPlan,
  Exercise,
  ExperienceLevel
} from '../../src/schemas/generated/schemas.js';

describe('MesocycleRotationService - Scheduled Deload Week (TASK-51, RF-10, CA-10.2)', () => {
  const service = new MesocycleRotationService();

  const mockExercise = (overrides?: Partial<Exercise>): Exercise => ({
    id: 'bench_press_id',
    name: 'Press de Banca Plano',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps', 'hombros'],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.75,
    video_url: 'https://youtube.com/watch?v=bench',
    video_fallback_url: 'https://smartforge.app/bench.webp',
    instructions: 'Ejecución del press de banca',
    is_active: true,
    ...overrides
  });

  const mockAssignment = (overrides?: Partial<ExerciseAssignment>): ExerciseAssignment => ({
    id: 'a0000000-0000-0000-0000-000000000001',
    session_plan_id: 's0000000-0000-0000-0000-000000000001',
    exercise_id: 'bench_press_id',
    exercise: mockExercise(),
    order_in_session: 1,
    target_sets: 4,
    target_reps: 10,
    target_rir: 2,
    target_load_kg: 80,
    is_swapped: false,
    ...overrides
  });

  const mockSession = (overrides?: Partial<SessionPlan>): SessionPlan => ({
    id: 's0000000-0000-0000-0000-000000000001',
    week_plan_id: 'w0000000-0000-0000-0000-000000000001',
    day_number: 1,
    name: 'Día 1 - Torso',
    exercise_assignments: [
      mockAssignment({
        id: 'a1',
        target_sets: 4,
        target_load_kg: 80,
        target_rir: 2
      }),
      mockAssignment({
        id: 'a2',
        exercise_id: 'row_id',
        exercise: mockExercise({ id: 'row_id', name: 'Remo con barra', movement_pattern: 'tiron' }),
        target_sets: 3,
        target_load_kg: 60,
        target_rir: 2
      }),
      mockAssignment({
        id: 'a3',
        exercise_id: 'pushup_id',
        exercise: mockExercise({ id: 'pushup_id', name: 'Flexiones', equipment_id: 'sin_equipamiento' }),
        target_sets: 3,
        target_load_kg: 0,
        target_rir: 2
      })
    ],
    ...overrides
  });

  const mockWeek = (overrides?: Partial<WeekPlan>): WeekPlan => ({
    id: 'w0000000-0000-0000-0000-000000000001',
    mesocycle_id: 'm0000000-0000-0000-0000-000000000001',
    week_number: 1,
    is_deload: false,
    sessions: [mockSession()],
    ...overrides
  });

  describe('Constants and Singleton', () => {
    it('should export the expected deload constants and singleton', () => {
      expect(DELOAD_VOLUME_FACTOR).toBe(0.6); // -40% volume -> 60%
      expect(DELOAD_LOAD_FACTOR).toBe(0.9); // -10% load -> 90%
      expect(DELOAD_RIR_INCREMENT).toBe(1); // RIR +1
      expect(mesocycleRotationService).toBeInstanceOf(MesocycleRotationService);
    });
  });

  describe('calculateDeloadSets (-40% volume / safe downward rounding, min 1 set)', () => {
    it('should calculate 60% of 5 sets as 3 sets', () => {
      expect(service.calculateDeloadSets(5)).toBe(3);
    });

    it('should calculate 60% of 4 sets with safe downward rounding as 2 sets', () => {
      expect(service.calculateDeloadSets(4)).toBe(2);
    });

    it('should calculate 60% of 3 sets with safe downward rounding as 1 set', () => {
      expect(service.calculateDeloadSets(3)).toBe(1);
    });

    it('should calculate 60% of 2 sets with safe downward rounding as 1 set', () => {
      expect(service.calculateDeloadSets(2)).toBe(1);
    });

    it('should never return less than 1 set (minimum 1 set)', () => {
      expect(service.calculateDeloadSets(1)).toBe(1);
      expect(service.calculateDeloadSets(0)).toBe(1);
    });

    it('should allow rounding mode override if requested', () => {
      // 3 * 0.6 = 1.8 -> round gives 2, floor gives 1
      expect(service.calculateDeloadSets(3, 'round')).toBe(2);
      expect(service.calculateDeloadSets(3, 'floor')).toBe(1);
    });
  });

  describe('calculateDeloadLoad (-10% load / 90% base load, 1 decimal precision)', () => {
    it('should reduce 100 kg to 90.0 kg', () => {
      expect(service.calculateDeloadLoad(100)).toBe(90.0);
    });

    it('should reduce 80 kg to 72.0 kg', () => {
      expect(service.calculateDeloadLoad(80)).toBe(72.0);
    });

    it('should reduce 65 kg to 58.5 kg', () => {
      expect(service.calculateDeloadLoad(65)).toBe(58.5);
    });

    it('should reduce 52.5 kg to 47.3 kg (1 decimal precision)', () => {
      expect(service.calculateDeloadLoad(52.5)).toBe(47.3);
    });

    it('should keep 0 kg (bodyweight) as 0.0 kg', () => {
      expect(service.calculateDeloadLoad(0)).toBe(0.0);
      expect(service.calculateDeloadLoad(-5)).toBe(0.0);
    });
  });

  describe('calculateDeloadRir (Target RIR +1)', () => {
    it('should increment standard target RIR 2 to 3', () => {
      expect(service.calculateDeloadRir(2)).toBe(3);
    });

    it('should increment target RIR 1 to 2', () => {
      expect(service.calculateDeloadRir(1)).toBe(2);
    });

    it('should increment target RIR 0 to 1', () => {
      expect(service.calculateDeloadRir(0)).toBe(1);
    });

    it('should increment target RIR 3 to 4', () => {
      expect(service.calculateDeloadRir(3)).toBe(4);
    });

    it('should cap target RIR at 5 max', () => {
      expect(service.calculateDeloadRir(5)).toBe(5);
      expect(service.calculateDeloadRir(6)).toBe(5);
    });

    it('should default to 3 when base RIR is undefined or 2', () => {
      expect(service.calculateDeloadRir()).toBe(3);
    });
  });

  describe('isDeloadWeek and getDeloadWeekNumber', () => {
    it('should identify week 4 as deload for beginner (4 weeks total)', () => {
      expect(service.getDeloadWeekNumber('principiante')).toBe(4);
      expect(service.isDeloadWeek(1, 4)).toBe(false);
      expect(service.isDeloadWeek(2, 4)).toBe(false);
      expect(service.isDeloadWeek(3, 4)).toBe(false);
      expect(service.isDeloadWeek(4, 4)).toBe(true);
    });

    it('should identify week 6 as deload for intermediate (6 weeks total)', () => {
      expect(service.getDeloadWeekNumber('intermedio')).toBe(6);
      expect(service.isDeloadWeek(5, 6)).toBe(false);
      expect(service.isDeloadWeek(6, 6)).toBe(true);
    });

    it('should identify week 8 as deload for advanced (8 weeks total)', () => {
      expect(service.getDeloadWeekNumber('avanzado')).toBe(8);
      expect(service.isDeloadWeek(7, 8)).toBe(false);
      expect(service.isDeloadWeek(8, 8)).toBe(true);
    });

    it('should support numeric duration in getDeloadWeekNumber', () => {
      expect(service.getDeloadWeekNumber(5)).toBe(5);
      expect(service.getDeloadWeekNumber(7)).toBe(7);
    });
  });

  describe('applyDeloadToAssignment', () => {
    it('should transform an ExerciseAssignment with -40% sets, -10% load, and RIR +1', () => {
      const assignment = mockAssignment({
        target_sets: 4,
        target_load_kg: 80,
        target_rir: 2,
        notes: 'Semana de trabajo'
      });

      const result = service.applyDeloadToAssignment(assignment);

      expect(result.target_sets).toBe(2); // 4 * 0.6 = 2.4 -> 2
      expect(result.target_load_kg).toBe(72.0); // 80 * 0.9 = 72
      expect(result.target_rir).toBe(3); // 2 + 1 = 3
      expect(result.exercise_id).toBe(assignment.exercise_id);
      expect(result.order_in_session).toBe(assignment.order_in_session);
    });

    it('should preserve 0 kg load for bodyweight exercises', () => {
      const bwAssignment = mockAssignment({
        target_sets: 3,
        target_load_kg: 0,
        target_rir: 2
      });

      const result = service.applyDeloadToAssignment(bwAssignment);
      expect(result.target_sets).toBe(1);
      expect(result.target_load_kg).toBe(0);
      expect(result.target_rir).toBe(3);
    });
  });

  describe('applyDeloadToSession', () => {
    it('should transform all assignments in a session', () => {
      const session = mockSession();
      const result = service.applyDeloadToSession(session);

      expect(result.id).toBe(session.id);
      expect(result.day_number).toBe(session.day_number);
      expect(result.exercise_assignments).toHaveLength(3);

      // Assignment 1: 4 sets -> 2, 80kg -> 72kg, RIR 2 -> 3
      expect(result.exercise_assignments[0].target_sets).toBe(2);
      expect(result.exercise_assignments[0].target_load_kg).toBe(72);
      expect(result.exercise_assignments[0].target_rir).toBe(3);

      // Assignment 2: 3 sets -> 1, 60kg -> 54kg, RIR 2 -> 3
      expect(result.exercise_assignments[1].target_sets).toBe(1);
      expect(result.exercise_assignments[1].target_load_kg).toBe(54);
      expect(result.exercise_assignments[1].target_rir).toBe(3);

      // Assignment 3: 3 sets -> 1, 0kg -> 0kg, RIR 2 -> 3
      expect(result.exercise_assignments[2].target_sets).toBe(1);
      expect(result.exercise_assignments[2].target_load_kg).toBe(0);
      expect(result.exercise_assignments[2].target_rir).toBe(3);
    });
  });

  describe('applyDeloadToWeek and generateDeloadWeek', () => {
    it('should mark week as is_deload: true and transform all sessions', () => {
      const regularWeek = mockWeek({
        week_number: 4,
        is_deload: false
      });

      const deloadWeek = service.applyDeloadToWeek(regularWeek);

      expect(deloadWeek.is_deload).toBe(true);
      expect(deloadWeek.week_number).toBe(4);
      expect(deloadWeek.sessions).toHaveLength(1);
      expect(deloadWeek.sessions[0].exercise_assignments[0].target_sets).toBe(2);
      expect(deloadWeek.sessions[0].exercise_assignments[0].target_load_kg).toBe(72);
      expect(deloadWeek.sessions[0].exercise_assignments[0].target_rir).toBe(3);
    });

    it('should generate a new deload week based on a prior regular week with updated week_number', () => {
      const week3 = mockWeek({
        week_number: 3,
        is_deload: false
      });

      const deloadWeek4 = service.generateDeloadWeek(week3, 4);

      expect(deloadWeek4.week_number).toBe(4);
      expect(deloadWeek4.is_deload).toBe(true);
      expect(deloadWeek4.sessions[0].exercise_assignments[0].target_sets).toBe(2);
      expect(deloadWeek4.sessions[0].exercise_assignments[0].target_load_kg).toBe(72);
      expect(deloadWeek4.sessions[0].exercise_assignments[0].target_rir).toBe(3);
    });
  });

  describe('Full Mesocycle Deload Verification across Experience Levels (CA-10.2)', () => {
    const testCases: { level: ExperienceLevel; totalWeeks: number }[] = [
      { level: 'principiante', totalWeeks: 4 },
      { level: 'intermedio', totalWeeks: 6 },
      { level: 'avanzado', totalWeeks: 8 }
    ];

    testCases.forEach(({ level, totalWeeks }) => {
      it(`should verify deload week is week ${totalWeeks} with correct reductions for ${level}`, () => {
        const deloadWeekNum = service.getDeloadWeekNumber(level);
        expect(deloadWeekNum).toBe(totalWeeks);

        for (let w = 1; w <= totalWeeks; w++) {
          const isDeload = service.isDeloadWeek(w, totalWeeks);
          if (w === totalWeeks) {
            expect(isDeload).toBe(true);
          } else {
            expect(isDeload).toBe(false);
          }
        }
      });
    });
  });
});
