import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MesocycleGeneratorService,
  LIMITED_EQUIPMENT_WARNING
} from '../../src/services/mesocycle-generator.service.js';
import type { ExerciseRepository } from '../../src/repositories/exercise.repository.js';
import type { MesocycleRepository } from '../../src/repositories/mesocycle.repository.js';
import type { AthleteProfile, Exercise } from '../../src/schemas/generated/schemas.js';

describe('TASK-26: Strict Equipment Filtering and Bodyweight Volume Adjustment (CA-02.2, CL-21)', () => {
  let mockExerciseRepo: Partial<ExerciseRepository>;
  let mockMesocycleRepo: Partial<MesocycleRepository>;
  let generatorService: MesocycleGeneratorService;

  const sampleCatalog: Exercise[] = [
    // Bodyweight exercises
    {
      id: 'flexiones_suelo',
      name: 'Flexiones de brazos en suelo',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps', 'hombros'],
      equipment_id: 'bodyweight',
      is_compound: true,
      initial_load_ratio: 0.6,
      video_url: 'https://youtube.com/watch?v=1',
      video_fallback_url: 'https://assets.smartforge.app/1.webp',
      instructions: 'Flexiones clásicas.',
      is_active: true
    },
    {
      id: 'fondos_silla',
      name: 'Fondos en banco/silla',
      movement_pattern: 'empuje',
      primary_muscle: 'triceps',
      secondary_muscles: ['pecho'],
      equipment_id: 'bodyweight',
      is_compound: true,
      initial_load_ratio: 0.5,
      video_url: 'https://youtube.com/watch?v=2',
      video_fallback_url: 'https://assets.smartforge.app/2.webp',
      instructions: 'Fondos tríceps.',
      is_active: true
    },
    {
      id: 'dominadas_australianas',
      name: 'Remos invertidos / Australian pull-ups',
      movement_pattern: 'tiron',
      primary_muscle: 'espalda',
      secondary_muscles: ['biceps'],
      equipment_id: 'bodyweight',
      is_compound: true,
      initial_load_ratio: 0.6,
      video_url: 'https://youtube.com/watch?v=3',
      video_fallback_url: 'https://assets.smartforge.app/3.webp',
      instructions: 'Remo invertido bajo mesa o barra baja.',
      is_active: true
    },
    {
      id: 'sentadilla_aire',
      name: 'Sentadilla al aire (Air Squat)',
      movement_pattern: 'rodilla_dominante',
      primary_muscle: 'cuadriceps',
      secondary_muscles: ['gluteos'],
      equipment_id: 'bodyweight',
      is_compound: true,
      initial_load_ratio: 0.0,
      video_url: 'https://youtube.com/watch?v=4',
      video_fallback_url: 'https://assets.smartforge.app/4.webp',
      instructions: 'Sentadilla con peso corporal.',
      is_active: true
    },
    {
      id: 'puente_gluteo_suelo',
      name: 'Puente de glúteos en suelo',
      movement_pattern: 'cadera_dominante',
      primary_muscle: 'gluteos',
      secondary_muscles: ['isquiosurales'],
      equipment_id: 'bodyweight',
      is_compound: true,
      initial_load_ratio: 0.0,
      video_url: 'https://youtube.com/watch?v=5',
      video_fallback_url: 'https://assets.smartforge.app/5.webp',
      instructions: 'Elevación de pelvis.',
      is_active: true
    },
    {
      id: 'plancha_abdominal',
      name: 'Plancha abdominal',
      movement_pattern: 'core',
      primary_muscle: 'core',
      secondary_muscles: [],
      equipment_id: 'bodyweight',
      is_compound: false,
      initial_load_ratio: 0.0,
      video_url: 'https://youtube.com/watch?v=6',
      video_fallback_url: 'https://assets.smartforge.app/6.webp',
      instructions: 'Plancha isométrica.',
      is_active: true
    },
    // Barbell & Rack exercises
    {
      id: 'press_banca_barra',
      name: 'Press de banca con barra',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.65,
      video_url: 'https://youtube.com/watch?v=7',
      video_fallback_url: 'https://assets.smartforge.app/7.webp',
      instructions: 'Press plano.',
      is_active: true
    },
    {
      id: 'remo_barra',
      name: 'Remo con barra',
      movement_pattern: 'tiron',
      primary_muscle: 'espalda',
      secondary_muscles: ['biceps'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.55,
      video_url: 'https://youtube.com/watch?v=8',
      video_fallback_url: 'https://assets.smartforge.app/8.webp',
      instructions: 'Remo inclinado.',
      is_active: true
    },
    {
      id: 'sentadilla_trasera',
      name: 'Sentadilla trasera con barra',
      movement_pattern: 'rodilla_dominante',
      primary_muscle: 'cuadriceps',
      secondary_muscles: ['gluteos'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.75,
      video_url: 'https://youtube.com/watch?v=9',
      video_fallback_url: 'https://assets.smartforge.app/9.webp',
      instructions: 'Sentadilla con barra en rack.',
      is_active: true
    },
    {
      id: 'peso_muerto_rumano_barra',
      name: 'Peso muerto rumano con barra',
      movement_pattern: 'cadera_dominante',
      primary_muscle: 'isquiosurales',
      secondary_muscles: ['gluteos'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.7,
      video_url: 'https://youtube.com/watch?v=10',
      video_fallback_url: 'https://assets.smartforge.app/10.webp',
      instructions: 'Bisagra con barra.',
      is_active: true
    },
    // Dumbbells & Cable exercises
    {
      id: 'cruces_polea',
      name: 'Cruces en polea',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: [],
      equipment_id: 'cable_crossover',
      is_compound: false,
      initial_load_ratio: 0.2,
      video_url: 'https://youtube.com/watch?v=11',
      video_fallback_url: 'https://assets.smartforge.app/11.webp',
      instructions: 'Aperturas en polea.',
      is_active: true
    }
  ];

  beforeEach(() => {
    mockExerciseRepo = {
      findAll: vi.fn().mockResolvedValue(sampleCatalog),
      findById: vi.fn().mockImplementation(async (id: string) => {
        return sampleCatalog.find((e) => e.id === id) || null;
      })
    };
    mockMesocycleRepo = {
      create: vi.fn().mockImplementation(async (data) => data),
      archiveActiveByAthleteId: vi.fn().mockResolvedValue(1)
    };
    generatorService = new MesocycleGeneratorService(
      mockExerciseRepo as ExerciseRepository,
      mockMesocycleRepo as MesocycleRepository
    );
  });

  it('should define the constant LIMITED_EQUIPMENT_WARNING', () => {
    expect(LIMITED_EQUIPMENT_WARNING).toBe('Volumen limitado por el equipamiento disponible');
  });

  describe('Strict equipment matching (CA-02.2)', () => {
    it('should assign ONLY exercises matching athlete equipment or bodyweight', async () => {
      const athlete: AthleteProfile = {
        id: 'athlete-barbell-only',
        google_id: 'g-111',
        email: 'barbell@example.com',
        name: 'Barbell Athlete',
        age: 28,
        weight_kg: 80,
        experience_level: 'intermedio',
        training_goal: 'fuerza',
        available_days_per_week: 3,
        equipment: [{ id: 'barbell', name: 'Barra olímpica', category: 'free_weights' }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const plan = await generatorService.generatePlanStructure(athlete, sampleCatalog, 4);

      const exerciseMap = new Map(sampleCatalog.map((e) => [e.id, e]));

      for (const week of plan.weeks) {
        for (const session of week.sessions) {
          for (const assignment of session.exercise_assignments) {
            const ex = exerciseMap.get(assignment.exercise_id);
            expect(ex).toBeDefined();
            expect(['barbell', 'bodyweight']).toContain(ex?.equipment_id);
            expect(ex?.equipment_id).not.toBe('cable_crossover');
          }
        }
      }
    });
  });

  describe('Bodyweight-only athlete generation (CL-21)', () => {
    it('should generate a 100% bodyweight routine when athlete only has bodyweight equipment', async () => {
      const bodyweightAthlete: AthleteProfile = {
        id: 'athlete-bw-only',
        google_id: 'g-222',
        email: 'bw@example.com',
        name: 'Calisthenics Athlete',
        age: 24,
        weight_kg: 70,
        experience_level: 'principiante',
        training_goal: 'hipertrofia',
        available_days_per_week: 3,
        equipment: [
          { id: 'bodyweight', name: 'Sin equipamiento (peso corporal)', category: 'bodyweight' }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const plan = await generatorService.generatePlanStructure(
        bodyweightAthlete,
        sampleCatalog,
        4
      );

      const exerciseMap = new Map(sampleCatalog.map((e) => [e.id, e]));

      for (const week of plan.weeks) {
        for (const session of week.sessions) {
          for (const assignment of session.exercise_assignments) {
            const ex = exerciseMap.get(assignment.exercise_id);
            expect(ex).toBeDefined();
            expect(ex?.equipment_id).toBe('bodyweight');
          }
        }
      }
    });

    it('should include LIMITED_EQUIPMENT_WARNING when equipment is constrained (CA-02.2, CL-21)', async () => {
      const bodyweightAthlete: AthleteProfile = {
        id: 'athlete-bw-only',
        google_id: 'g-222',
        email: 'bw@example.com',
        name: 'Calisthenics Athlete',
        age: 24,
        weight_kg: 70,
        experience_level: 'avanzado', // Advanced athlete on only bodyweight has volume limitations
        training_goal: 'hipertrofia',
        available_days_per_week: 4,
        equipment: [
          { id: 'bodyweight', name: 'Sin equipamiento (peso corporal)', category: 'bodyweight' }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const isConstrained = generatorService.isEquipmentConstrained(
        bodyweightAthlete,
        sampleCatalog
      );
      expect(isConstrained).toBe(true);

      const plan = await generatorService.generatePlanStructure(
        bodyweightAthlete,
        sampleCatalog,
        4
      );

      // Verify the warning is present in plan name, notes or sessions
      const hasWarning =
        plan.name.includes(LIMITED_EQUIPMENT_WARNING) ||
        plan.weeks.some((w) =>
          w.sessions.some(
            (s) =>
              s.name.includes(LIMITED_EQUIPMENT_WARNING) ||
              s.exercise_assignments.some((a) => a.notes?.includes(LIMITED_EQUIPMENT_WARNING))
          )
        );

      expect(hasWarning).toBe(true);
    });

    it('should NOT flag volume warning when athlete has complete gym equipment', async () => {
      const fullGymAthlete: AthleteProfile = {
        id: 'athlete-full-gym',
        google_id: 'g-333',
        email: 'gym@example.com',
        name: 'Full Gym Athlete',
        age: 30,
        weight_kg: 85,
        experience_level: 'intermedio',
        training_goal: 'hipertrofia',
        available_days_per_week: 4,
        equipment: [
          { id: 'barbell', name: 'Barra olímpica', category: 'free_weights' },
          { id: 'power_rack', name: 'Rack', category: 'racks' },
          { id: 'cable_crossover', name: 'Poleas', category: 'cables' },
          { id: 'bodyweight', name: 'Peso corporal', category: 'bodyweight' }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const isConstrained = generatorService.isEquipmentConstrained(
        fullGymAthlete,
        sampleCatalog
      );
      expect(isConstrained).toBe(false);

      const plan = await generatorService.generatePlanStructure(
        fullGymAthlete,
        sampleCatalog,
        4
      );

      const hasWarning =
        plan.name.includes(LIMITED_EQUIPMENT_WARNING) ||
        plan.weeks.some((w) =>
          w.sessions.some((s) => s.name.includes(LIMITED_EQUIPMENT_WARNING))
        );

      expect(hasWarning).toBe(false);
    });
  });
});
