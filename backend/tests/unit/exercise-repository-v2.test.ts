import { describe, it, expect, vi } from 'vitest';
import {
  ExerciseRepository,
  type DbClient,
  type LoadType
} from '../../src/repositories/exercise.repository.js';

describe('TASK-13: ExerciseRepository V2 - load_type mapping and compatible alternatives', () => {
  const sampleExerciseRow = {
    id: 'dominadas_pronadas',
    name: 'Dominadas pronadas',
    movement_pattern: 'tiron',
    primary_muscle: 'espalda',
    secondary_muscles: ['biceps'],
    equipment_id: 'pull_up_bar',
    is_compound: true,
    initial_load_ratio: '1.0',
    video_url: 'https://assets.smartforge.app/videos/pull_ups.mp4',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/pull_ups.webp',
    instructions: 'Agarre prono al ancho de hombros.',
    is_active: true,
    load_type: 'bodyweight_loadable'
  };

  it('findById should map load_type and include load_type in SELECT query', async () => {
    const mockDb: DbClient = {
      query: vi.fn().mockImplementation(async (sql: string, params?: unknown[]) => {
        expect(sql).toContain('load_type');
        if (params && params[0] === 'dominadas_pronadas') {
          return { rows: [sampleExerciseRow] };
        }
        return { rows: [] };
      })
    };

    const repo = new ExerciseRepository(mockDb);
    const exercise = await repo.findById('dominadas_pronadas');

    expect(exercise).not.toBeNull();
    expect(exercise?.id).toBe('dominadas_pronadas');
    expect(exercise?.load_type).toBe('bodyweight_loadable');
  });

  it('findById should default load_type to external_load if missing from row', async () => {
    const rowWithoutLoadType = { ...sampleExerciseRow };
    delete (rowWithoutLoadType as Record<string, unknown>).load_type;

    const mockDb: DbClient = {
      query: vi.fn().mockResolvedValue({ rows: [rowWithoutLoadType] })
    };

    const repo = new ExerciseRepository(mockDb);
    const exercise = await repo.findById('dominadas_pronadas');

    expect(exercise).not.toBeNull();
    expect(exercise?.load_type).toBe('external_load');
  });

  it('findAll should filter by single load_type', async () => {
    const mockQuery = vi.fn().mockResolvedValue({ rows: [sampleExerciseRow] });
    const mockDb: DbClient = { query: mockQuery };

    const repo = new ExerciseRepository(mockDb);
    const results = await repo.findAll({ load_type: 'bodyweight_loadable' });

    expect(results).toHaveLength(1);
    expect(results[0].load_type).toBe('bodyweight_loadable');

    const [calledSql, calledParams] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(calledSql).toContain('load_type =');
    expect(calledSql).toContain('SELECT');
    expect(calledSql).toContain('load_type');
    expect(calledParams).toContain('bodyweight_loadable');
  });

  it('findAll should filter by multiple load_types using ANY', async () => {
    const mockQuery = vi.fn().mockResolvedValue({ rows: [sampleExerciseRow] });
    const mockDb: DbClient = { query: mockQuery };

    const repo = new ExerciseRepository(mockDb);
    const targetLoadTypes: LoadType[] = ['bodyweight', 'bodyweight_loadable'];
    const results = await repo.findAll({ load_types: targetLoadTypes });

    expect(results).toHaveLength(1);

    const [calledSql, calledParams] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(calledSql).toContain('load_type = ANY(');
    expect(calledParams).toContainEqual(targetLoadTypes);
  });

  it('findByLoadType should query exercises by load_type array or single value', async () => {
    const mockQuery = vi.fn().mockResolvedValue({ rows: [sampleExerciseRow] });
    const mockDb: DbClient = { query: mockQuery };

    const repo = new ExerciseRepository(mockDb);
    const singleResult = await repo.findByLoadType('bodyweight_loadable');
    expect(singleResult).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('load_type = ANY($1)'),
      [['bodyweight_loadable']]
    );

    mockQuery.mockClear();
    mockQuery.mockResolvedValue({ rows: [sampleExerciseRow] });

    const multiResult = await repo.findByLoadType(['bodyweight', 'bodyweight_loadable']);
    expect(multiResult).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('load_type = ANY($1)'),
      [['bodyweight', 'bodyweight_loadable']]
    );
  });

  it('findAlternatives should map alt_load_type on alternative_exercise', async () => {
    const mockAltRow = {
      original_exercise_id: 'dominadas_pronadas',
      similarity_score: '0.90',
      alt_id: 'jalon_al_pecho',
      alt_name: 'Jalón al pecho en polea',
      alt_movement_pattern: 'tiron',
      alt_primary_muscle: 'espalda',
      alt_secondary_muscles: ['biceps'],
      alt_equipment_id: 'cable_pulley',
      alt_is_compound: true,
      alt_initial_load_ratio: '0.70',
      alt_video_url: 'https://assets.smartforge.app/videos/lat_pulldown.mp4',
      alt_video_fallback_url: 'https://assets.smartforge.app/fallbacks/lat_pulldown.webp',
      instructions: 'Llevar la barra a la clavícula.',
      alt_is_active: true,
      alt_load_type: 'external_load'
    };

    const mockQuery = vi.fn().mockResolvedValue({ rows: [mockAltRow] });
    const mockDb: DbClient = { query: mockQuery };

    const repo = new ExerciseRepository(mockDb);
    const alternatives = await repo.findAlternatives('dominadas_pronadas', ['cable_pulley']);

    expect(alternatives).toHaveLength(1);
    expect(alternatives[0].alternative_exercise.load_type).toBe('external_load');

    const [calledSql] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(calledSql).toContain('e.load_type AS alt_load_type');
  });

  it('findAlternatives should filter by allowedLoadTypes when provided', async () => {
    const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
    const mockDb: DbClient = { query: mockQuery };

    const repo = new ExerciseRepository(mockDb);
    await repo.findAlternatives('dominadas_pronadas', ['pull_up_bar'], ['bodyweight_loadable']);

    const [calledSql, calledParams] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(calledSql).toContain('e.load_type = ANY(');
    expect(calledParams).toContainEqual(['bodyweight_loadable']);
  });

  it('findAlternatives should support options object with allowedLoadTypes', async () => {
    const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
    const mockDb: DbClient = { query: mockQuery };

    const repo = new ExerciseRepository(mockDb);
    await repo.findAlternatives('dominadas_pronadas', {
      equipmentIds: ['pull_up_bar'],
      allowedLoadTypes: ['bodyweight', 'bodyweight_loadable']
    });

    const [calledSql, calledParams] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(calledSql).toContain('e.load_type = ANY(');
    expect(calledParams).toContainEqual(['bodyweight', 'bodyweight_loadable']);
  });

  it('count should include load_type filters', async () => {
    const mockQuery = vi.fn().mockResolvedValue({ rows: [{ total: '3' }] });
    const mockDb: DbClient = { query: mockQuery };

    const repo = new ExerciseRepository(mockDb);
    const total = await repo.count({ load_type: 'bodyweight' });

    expect(total).toBe(3);
    const [calledSql, calledParams] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(calledSql).toContain('load_type =');
    expect(calledParams).toContain('bodyweight');
  });
});
