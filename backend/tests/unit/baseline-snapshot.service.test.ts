import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BaselineSnapshotService,
  baselineSnapshotService,
  computeE1RM,
  DEFAULT_INITIAL_LOAD_RATIOS
} from '../../src/services/baseline-snapshot.service.js';
import type { LoadType } from '../../src/schemas/generated/schemas.js';

describe('TASK-26: BaselineSnapshotService Unit Tests (RF-05, Constitución Art. 4)', () => {
  const sampleAthleteId = '11111111-1111-1111-1111-111111111111';
  const sampleMesocycleId = '22222222-2222-2222-2222-222222222222';
  const sampleAthleteWeight = 75.0;

  let mockBaselineSnapshotRepo: any;
  let mockSetLogRepo: any;
  let mockExerciseRepo: any;
  let mockAthleteRepo: any;
  let mockBodyWeightRepo: any;
  let service: BaselineSnapshotService;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockBaselineSnapshotRepo = {
      create: vi.fn(),
      createBatch: vi.fn(),
      findByMesocycleId: vi.fn(),
      findByMesocycleAndExercise: vi.fn()
    };

    mockSetLogRepo = {
      findRecentSetsForExercise: vi.fn()
    };

    mockExerciseRepo = {
      findById: vi.fn()
    };

    mockAthleteRepo = {
      findById: vi.fn().mockResolvedValue({
        id: sampleAthleteId,
        weight_kg: sampleAthleteWeight,
        experience_level: 'intermedio'
      })
    };

    mockBodyWeightRepo = {
      findLatestBeforeDate: vi.fn().mockResolvedValue({
        weight_kg: sampleAthleteWeight
      })
    };

    service = new BaselineSnapshotService(
      mockBaselineSnapshotRepo,
      mockSetLogRepo,
      mockExerciseRepo,
      mockAthleteRepo,
      mockBodyWeightRepo
    );
  });

  describe('1. Cálculo híbrido de e1RM y taxonomía de cargas (RF-05, RF-06)', () => {
    it('debe calcular e1RM con Brzycki para <= 10 repeticiones en carga externa', () => {
      // 100 kg x 5 reps con Brzycki:
      // 100 / (1.0278 - 0.0278 * 5) = 100 / 0.8888 = 112.51 kg
      const e1rm = computeE1RM('external_load', 100, 5, sampleAthleteWeight);
      expect(e1rm).toBe(112.51);
    });

    it('debe calcular e1RM con Wathan para 11 a 30 repeticiones evitando divergencias', () => {
      // 70 kg x 15 reps con Wathan:
      // denominador = 48.8 + (53.8 * exp(-0.075 * 15)) = 48.8 + 17.466 = 66.266
      // (100 * 70) / 66.266 = 105.63 kg
      const e1rm = computeE1RM('external_load', 70, 15, sampleAthleteWeight);
      expect(e1rm).toBeCloseTo(105.63, 1);
    });

    it('debe saturar a 30 repeticiones cuando reps > 30 para estabilidad matemática', () => {
      const e1rm30 = computeE1RM('external_load', 50, 30, sampleAthleteWeight);
      const e1rm45 = computeE1RM('external_load', 50, 45, sampleAthleteWeight);
      expect(e1rm45).toBe(e1rm30);
    });

    it('debe calcular masa total para bodyweight y bodyweight_loadable sumando peso del atleta', () => {
      // Bodyweight: peso corporal = 75 kg, 10 reps Brzycki:
      // 75 / (1.0278 - 0.278) = 75 / 0.7498 = 100.03 kg
      const bwE1rm = computeE1RM('bodyweight', 0, 10, sampleAthleteWeight);
      expect(bwE1rm).toBe(100.03);

      // Bodyweight loadable: masa = 75 + 15 = 90 kg, 10 reps:
      // 90 / 0.7498 = 120.03 kg
      const bwlE1rm = computeE1RM('bodyweight_loadable', 15, 10, sampleAthleteWeight);
      expect(bwlE1rm).toBe(120.03);
    });

    it('debe respetar el piso de 1.0 kg en calisténicos asistidos (RF-06 CA-06.2)', () => {
      // Asistencia = 50 kg con atleta de 75 kg -> masa neta = 25 kg
      const assistedE1rm = computeE1RM('assisted_bodyweight', 50, 8, sampleAthleteWeight);
      expect(assistedE1rm).toBeGreaterThan(0);

      // Asistencia >= peso corporal (ej. 80 kg de asistencia con atleta de 75 kg) -> piso de 1.0 kg
      const flooredE1rm = computeE1RM('assisted_bodyweight', 80, 10, sampleAthleteWeight);
      expect(flooredE1rm).toBeCloseTo(1.0 / 0.7498, 2);
    });
  });

  describe('2. Selección de serie con mayor e1RM (RIR <= 3) y desempate por kg (RF-05 CA-05.2 #1)', () => {
    it('debe seleccionar la serie de mayor e1RM cuando existen series con RIR <= 3 en últimos 90 días', async () => {
      mockSetLogRepo.findRecentSetsForExercise.mockResolvedValueOnce([
        {
          id: 'set-1',
          weight_kg: 80,
          reps_completed: 8,
          rir: 2,
          load_type: 'external_load'
        },
        {
          id: 'set-2', // 85kg x 8 reps -> e1RM más alto
          weight_kg: 85,
          reps_completed: 8,
          rir: 1,
          load_type: 'external_load'
        },
        {
          id: 'set-3',
          weight_kg: 90,
          reps_completed: 5,
          rir: 3,
          load_type: 'external_load'
        }
      ]);

      const baseline = await service.resolveBaselineForExercise(
        sampleAthleteId,
        'press_banca',
        sampleAthleteWeight,
        'intermedio',
        sampleMesocycleId
      );

      expect(baseline.source_type).toBe('history_rir_le_3');
      expect(baseline.baseline_load_kg).toBe(85);
      expect(baseline.baseline_reps).toBe(8);
      expect(baseline.baseline_e1rm_kg).toBe(computeE1RM('external_load', 85, 8, sampleAthleteWeight));
    });

    it('debe desempatar por mayor peso en kg cuando dos series producen igual e1RM', async () => {
      // Dos series con igual e1RM teórico
      mockSetLogRepo.findRecentSetsForExercise.mockResolvedValueOnce([
        {
          id: 'set-a',
          weight_kg: 80,
          reps_completed: 6,
          rir: 2,
          load_type: 'external_load'
        },
        {
          id: 'set-b',
          weight_kg: 85,
          reps_completed: 6,
          rir: 2,
          load_type: 'external_load'
        }
      ]);

      const baseline = await service.resolveBaselineForExercise(
        sampleAthleteId,
        'press_banca',
        sampleAthleteWeight,
        'intermedio'
      );

      expect(baseline.baseline_load_kg).toBe(85);
    });
  });

  describe('3. Normalización de series submáximas (RIR 4 o 5) (RF-05 CA-05.2 #2)', () => {
    it('debe normalizar la serie de mayor peso con RIR 4 a RIR 2 cuando no existen series con RIR <= 3', async () => {
      // Fórmula: carga_base = carga * (1 + (RIR - 2) * 0.025)
      // Para RIR 4: factor = 1 + (4 - 2) * 0.025 = 1 + 0.05 = 1.05
      // 80 kg * 1.05 = 84.0 kg
      mockSetLogRepo.findRecentSetsForExercise.mockResolvedValueOnce([
        {
          id: 'submax-1',
          weight_kg: 80,
          reps_completed: 10,
          rir: 4,
          load_type: 'external_load'
        },
        {
          id: 'submax-2',
          weight_kg: 70,
          reps_completed: 10,
          rir: 5,
          load_type: 'external_load'
        }
      ]);

      const baseline = await service.resolveBaselineForExercise(
        sampleAthleteId,
        'sentadilla',
        sampleAthleteWeight,
        'intermedio',
        sampleMesocycleId
      );

      expect(baseline.source_type).toBe('history_rir_normalized');
      expect(baseline.baseline_load_kg).toBe(84.0);
      expect(baseline.baseline_reps).toBe(10);
      expect(baseline.baseline_e1rm_kg).toBe(computeE1RM('external_load', 84.0, 10, sampleAthleteWeight));
    });

    it('debe normalizar con RIR 5 con factor 1.075 si es la única serie disponible', async () => {
      // Para RIR 5: factor = 1 + (5 - 2) * 0.025 = 1 + 0.075 = 1.075
      // 100 kg * 1.075 = 107.5 kg
      mockSetLogRepo.findRecentSetsForExercise.mockResolvedValueOnce([
        {
          id: 'submax-rir5',
          weight_kg: 100,
          reps_completed: 8,
          rir: 5,
          load_type: 'external_load'
        }
      ]);

      const baseline = await service.resolveBaselineForExercise(
        sampleAthleteId,
        'peso_muerto',
        sampleAthleteWeight,
        'avanzado'
      );

      expect(baseline.source_type).toBe('history_rir_normalized');
      expect(baseline.baseline_load_kg).toBe(107.5);
    });
  });

  describe('4. Fallback a ratios teóricos de catálogo (RF-05 CA-05.2 #3)', () => {
    it('debe recurrir a ratio de catálogo y nivel de experiencia cuando no hay historial en 90 días', async () => {
      mockSetLogRepo.findRecentSetsForExercise.mockResolvedValueOnce([]); // sin historial en 90 días
      mockExerciseRepo.findById.mockResolvedValueOnce({
        id: 'press_banca',
        movement_pattern: 'empuje',
        is_compound: true,
        initial_load_ratio: 0.75,
        load_type: 'external_load'
      });

      const baseline = await service.resolveBaselineForExercise(
        sampleAthleteId,
        'press_banca',
        sampleAthleteWeight, // 75 kg
        'intermedio'
      );

      expect(baseline.source_type).toBe('experience_ratio_default');
      // 75 kg * 0.75 = 56.25 kg -> redondeo a múltiplo de 0.5 = 56.5 kg
      expect(baseline.baseline_load_kg).toBe(56.5);
      expect(baseline.baseline_reps).toBe(10);
      expect(baseline.baseline_e1rm_kg).toBe(computeE1RM('external_load', 56.5, 10, sampleAthleteWeight));
    });

    it('debe usar carga 0 para ejercicios de peso corporal sin historial', async () => {
      mockSetLogRepo.findRecentSetsForExercise.mockResolvedValueOnce([]);
      mockExerciseRepo.findById.mockResolvedValueOnce({
        id: 'flexiones',
        movement_pattern: 'empuje',
        is_compound: true,
        equipment_id: 'bodyweight',
        load_type: 'bodyweight'
      });

      const baseline = await service.resolveBaselineForExercise(
        sampleAthleteId,
        'flexiones',
        sampleAthleteWeight,
        'principiante'
      );

      expect(baseline.source_type).toBe('experience_ratio_default');
      expect(baseline.baseline_load_kg).toBe(0.0);
      expect(baseline.baseline_reps).toBe(10);
      expect(baseline.baseline_e1rm_kg).toBe(computeE1RM('bodyweight', 0, 10, sampleAthleteWeight));
    });
  });

  describe('5. Captura inmutable en lote de snapshots basales (RF-05 CA-05.1, CA-05.3)', () => {
    it('captureBaselinesForMesocycle debe generar y persistir snapshots para todos los ejercicios del ciclo', async () => {
      mockSetLogRepo.findRecentSetsForExercise.mockResolvedValue([]);
      mockExerciseRepo.findById.mockResolvedValue({
        id: 'bench',
        movement_pattern: 'empuje',
        is_compound: true,
        initial_load_ratio: 0.75,
        load_type: 'external_load'
      });

      mockBaselineSnapshotRepo.createBatch.mockImplementation(async (items: any[]) => items);

      const result = await service.captureBaselinesForMesocycle({
        mesocycleId: sampleMesocycleId,
        athleteId: sampleAthleteId,
        exerciseIds: ['bench', 'squat', 'bench'] // 'bench' duplicado debe ser desduplicado
      });

      expect(mockBaselineSnapshotRepo.createBatch).toHaveBeenCalledTimes(1);
      const createdItems = mockBaselineSnapshotRepo.createBatch.mock.calls[0][0];
      expect(createdItems).toHaveLength(2); // 'bench' y 'squat' únicos
      expect(createdItems[0].mesocycle_id).toBe(sampleMesocycleId);
      expect(createdItems[0].athlete_bodyweight_kg).toBe(sampleAthleteWeight);
    });
  });
});
