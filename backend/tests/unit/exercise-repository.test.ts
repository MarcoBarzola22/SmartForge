import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

type DbMock = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
};

describe('TASK-18: Exercise Repository (backend/src/repositories/exercise.repository.ts)', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const repoFilePath = path.join(
    rootDir,
    'backend',
    'src',
    'repositories',
    'exercise.repository.ts'
  );

  it('should have exercise.repository.ts file created', () => {
    expect(fs.existsSync(repoFilePath)).toBe(true);
  });

  it('should find active exercise by ID and return mapped Exercise or null', async () => {
    const { ExerciseRepository } = await import('../../src/repositories/exercise.repository.js');

    const mockRow = {
      id: 'press_banca_plano_barra',
      name: 'Press de banca plano con barra',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps', 'hombros'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: '0.65',
      video_url: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
      video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_banca_plano_barra.webp',
      instructions: 'Apoya bien los pies y retrae escápulas.',
      is_active: true
    };

    const mockDb: DbMock = {
      query: vi.fn().mockImplementation(async (sql: string, params?: unknown[]) => {
        if (params && params[0] === 'press_banca_plano_barra') {
          return { rows: [mockRow] };
        }
        return { rows: [] };
      })
    };

    const repo = new ExerciseRepository(mockDb);

    const exercise = await repo.findById('press_banca_plano_barra');
    expect(exercise).not.toBeNull();
    expect(exercise?.id).toBe('press_banca_plano_barra');
    expect(exercise?.initial_load_ratio).toBe(0.65);
    expect(exercise?.is_compound).toBe(true);
    expect(exercise?.secondary_muscles).toEqual(['triceps', 'hombros']);

    const notFound = await repo.findById('non_existent');
    expect(notFound).toBeNull();
  });

  it('should find all exercises with dynamic filters (movement_pattern, primary_muscle, equipment, search)', async () => {
    const { ExerciseRepository } = await import('../../src/repositories/exercise.repository.js');

    const mockRows = [
      {
        id: 'press_banca_plano_barra',
        name: 'Press de banca plano con barra',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho',
        secondary_muscles: ['triceps'],
        equipment_id: 'barbell',
        is_compound: true,
        initial_load_ratio: '0.65',
        video_url: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
        video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_banca_plano_barra.webp',
        instructions: 'Test cue',
        is_active: true
      }
    ];

    const mockQuery = vi.fn().mockResolvedValue({ rows: mockRows });
    const mockDb: DbMock = {
      query: mockQuery
    };

    const repo = new ExerciseRepository(mockDb);

    const results = await repo.findAll({
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      equipment_id: 'barbell',
      search: 'banca',
      limit: 10,
      offset: 0
    });

    expect(results).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalled();

    const [calledSql, calledParams] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(calledSql).toContain('is_active = true');
    expect(calledSql).toContain('movement_pattern =');
    expect(calledSql).toContain('primary_muscle =');
    expect(calledSql).toContain('equipment_id =');
    expect(calledSql).toContain('ILIKE');
    expect(calledParams).toContain('empuje');
    expect(calledParams).toContain('pecho');
    expect(calledParams).toContain('barbell');
    expect(calledParams).toContain('%banca%');
  });

  it('should find alternatives for an exercise filtered by equipment and sorted by similarity_score', async () => {
    const { ExerciseRepository } = await import('../../src/repositories/exercise.repository.js');

    const mockAltRows = [
      {
        original_exercise_id: 'press_banca_plano_barra',
        similarity_score: '0.95',
        alt_id: 'press_banca_plano_mancuernas',
        alt_name: 'Press de banca plano con mancuernas',
        alt_movement_pattern: 'empuje',
        alt_primary_muscle: 'pecho',
        alt_secondary_muscles: ['triceps'],
        alt_equipment_id: 'dumbbells',
        alt_is_compound: true,
        alt_initial_load_ratio: '0.55',
        alt_video_url: 'https://www.youtube.com/watch?v=VmB1G1K7v94',
        alt_video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_banca_plano_mancuernas.webp',
        alt_instructions: 'Test instructions',
        alt_is_active: true
      }
    ];

    const mockQuery = vi.fn().mockResolvedValue({ rows: mockAltRows });
    const mockDb: DbMock = {
      query: mockQuery
    };

    const repo = new ExerciseRepository(mockDb);

    const alternatives = await repo.findAlternatives('press_banca_plano_barra', ['dumbbells', 'flat_bench']);

    expect(alternatives).toHaveLength(1);
    expect(alternatives[0]?.original_exercise_id).toBe('press_banca_plano_barra');
    expect(alternatives[0]?.similarity_score).toBe(0.95);
    expect(alternatives[0]?.alternative_exercise.id).toBe('press_banca_plano_mancuernas');
    expect(alternatives[0]?.alternative_exercise.equipment_id).toBe('dumbbells');

    const [calledSql, calledParams] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(calledSql).toContain('exercise_alternative');
    expect(calledSql).toContain('JOIN exercise');
    expect(calledSql).toContain('is_active = true');
    expect(calledParams).toContain('press_banca_plano_barra');
    expect(calledParams).toContainEqual(['dumbbells', 'flat_bench', 'bodyweight']);
  });

  it('should find exercises matching available equipment list and count them', async () => {
    const { ExerciseRepository } = await import('../../src/repositories/exercise.repository.js');

    const mockQuery = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT(')) {
        return { rows: [{ total: '5' }] };
      }
      return { rows: [] };
    });

    const mockDb: DbMock = {
      query: mockQuery
    };

    const repo = new ExerciseRepository(mockDb);

    const totalCount = await repo.count({ primary_muscle: 'pecho' });
    expect(totalCount).toBe(5);

    await repo.findByEquipment(['barbell', 'dumbbells']);
    expect(mockQuery).toHaveBeenCalled();
  });
});
