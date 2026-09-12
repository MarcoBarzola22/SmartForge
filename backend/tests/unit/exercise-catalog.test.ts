import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { ExerciseCatalogService } from '../../src/services/exercise-catalog.service.js';
import { exerciseRepository } from '../../src/repositories/exercise.repository.js';
import type { Exercise, ExerciseAlternative } from '../../src/schemas/generated/schemas.js';
import { NotFoundError } from '../../src/errors/app-error.js';

describe('TASK-19: Exercise Catalog Service, Controller and Routes', () => {
  const mockExercise: Exercise = {
    id: 'press_banca_plano_barra',
    name: 'Press de banca plano con barra',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps', 'hombros'],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.65,
    video_url: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_banca_plano_barra.webp',
    instructions: 'Apoya bien los pies y retrae escápulas.',
    is_active: true
  };

  const mockAlternative: ExerciseAlternative = {
    original_exercise_id: 'press_banca_plano_barra',
    similarity_score: 0.95,
    alternative_exercise: {
      id: 'press_banca_plano_mancuernas',
      name: 'Press de banca plano con mancuernas',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps'],
      equipment_id: 'dumbbells',
      is_compound: true,
      initial_load_ratio: 0.55,
      video_url: 'https://www.youtube.com/watch?v=VmB1G1K7v94',
      video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_banca_plano_mancuernas.webp',
      instructions: 'Abre a 45 grados.',
      is_active: true
    }
  };

  describe('ExerciseCatalogService (Unit)', () => {
    it('should list exercises with optional filters', async () => {
      const mockRepo = {
        findById: vi.fn(),
        findAll: vi.fn().mockResolvedValue([mockExercise]),
        findAlternatives: vi.fn(),
        findByEquipment: vi.fn(),
        count: vi.fn()
      };

      const service = new ExerciseCatalogService(mockRepo as unknown as ExerciseRepository);
      const results = await service.listExercises({
        pattern: 'empuje',
        primary_muscle: 'pecho',
        equipment_id: 'barbell'
      });

      expect(results).toHaveLength(1);
      expect(mockRepo.findAll).toHaveBeenCalledWith({
        movement_pattern: 'empuje',
        primary_muscle: 'pecho',
        equipment_id: 'barbell'
      });
    });

    it('should return exercise by ID or throw NotFoundError if missing', async () => {
      const mockRepo = {
        findById: vi.fn().mockImplementation(async (id: string) => {
          if (id === 'press_banca_plano_barra') return mockExercise;
          return null;
        }),
        findAll: vi.fn(),
        findAlternatives: vi.fn(),
        findByEquipment: vi.fn(),
        count: vi.fn()
      };

      const service = new ExerciseCatalogService(mockRepo as unknown as ExerciseRepository);
      const ex = await service.getExerciseById('press_banca_plano_barra');
      expect(ex.id).toBe('press_banca_plano_barra');

      await expect(service.getExerciseById('invalid_id')).rejects.toThrow(NotFoundError);
    });

    it('should return alternatives or throw NotFoundError if original exercise not found', async () => {
      const mockRepo = {
        findById: vi.fn().mockImplementation(async (id: string) => {
          if (id === 'press_banca_plano_barra') return mockExercise;
          return null;
        }),
        findAll: vi.fn(),
        findAlternatives: vi.fn().mockResolvedValue([mockAlternative]),
        findByEquipment: vi.fn(),
        count: vi.fn()
      };

      const service = new ExerciseCatalogService(mockRepo as unknown as ExerciseRepository);
      const alts = await service.getAlternatives('press_banca_plano_barra', 'dumbbells');
      expect(alts).toHaveLength(1);
      expect(mockRepo.findAlternatives).toHaveBeenCalledWith('press_banca_plano_barra', ['dumbbells']);

      await expect(service.getAlternatives('invalid_id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('Exercise Routes and Contract Tests (HTTP)', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('GET /api/exercises should respond 200 with list of exercises', async () => {
      vi.spyOn(exerciseRepository, 'findAll').mockResolvedValue([mockExercise]);

      const app = createApp();
      const res = await request(app).get('/api/exercises');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe('press_banca_plano_barra');
    });

    it('GET /api/exercises/:id should respond 200 for existing exercise and 404 for unknown', async () => {
      vi.spyOn(exerciseRepository, 'findById').mockImplementation(async (id: string) => {
        if (id === 'press_banca_plano_barra') return mockExercise;
        return null;
      });

      const app = createApp();

      const successRes = await request(app).get('/api/exercises/press_banca_plano_barra');
      expect(successRes.status).toBe(200);
      expect(successRes.body.id).toBe('press_banca_plano_barra');

      const notFoundRes = await request(app).get('/api/exercises/non_existent_exercise_12345');
      expect(notFoundRes.status).toBe(404);
      expect(notFoundRes.body).toHaveProperty('error');
      expect(notFoundRes.body.code).toBe('NOT_FOUND');
    });

    it('GET /api/exercises/:id/alternatives should respond 200 for existing exercise and 404 for unknown', async () => {
      vi.spyOn(exerciseRepository, 'findById').mockImplementation(async (id: string) => {
        if (id === 'press_banca_plano_barra') return mockExercise;
        return null;
      });
      vi.spyOn(exerciseRepository, 'findAlternatives').mockResolvedValue([mockAlternative]);

      const app = createApp();

      const successRes = await request(app).get('/api/exercises/press_banca_plano_barra/alternatives');
      expect(successRes.status).toBe(200);
      expect(Array.isArray(successRes.body)).toBe(true);
      expect(successRes.body[0].alternative_exercise.id).toBe('press_banca_plano_mancuernas');

      const notFoundRes = await request(app).get('/api/exercises/non_existent_exercise_12345/alternatives');
      expect(notFoundRes.status).toBe(404);
      expect(notFoundRes.body).toHaveProperty('error');
      expect(notFoundRes.body.code).toBe('NOT_FOUND');
    });
  });
});
