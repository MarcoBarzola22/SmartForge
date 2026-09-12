import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('TASK-17: 200+ Exercises Dataset and Seed (backend/src/db/seeds/exercises.seed.ts)', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const seedFilePath = path.join(
    rootDir,
    'backend',
    'src',
    'db',
    'seeds',
    'exercises.seed.ts'
  );
  const backendPkgPath = path.join(rootDir, 'backend', 'package.json');
  const rootPkgPath = path.join(rootDir, 'package.json');

  it('should have exercises.seed.ts file created', () => {
    expect(fs.existsSync(seedFilePath)).toBe(true);
  });

  it('should export at least 200 valid exercises in EXERCISE_SEED_DATA', async () => {
    const { EXERCISE_SEED_DATA } = await import('../../src/db/seeds/exercises.seed.js');
    expect(Array.isArray(EXERCISE_SEED_DATA)).toBe(true);
    expect(EXERCISE_SEED_DATA.length).toBeGreaterThanOrEqual(200);

    const validPatterns = new Set(['empuje', 'tiron', 'rodilla_dominante', 'cadera_dominante', 'core']);
    const validMuscles = new Set([
      'pecho', 'espalda', 'cuadriceps', 'isquiosurales', 'gluteos',
      'hombros', 'biceps', 'triceps', 'pantorrillas', 'core'
    ]);
    const validEquipments = new Set([
      'barbell', 'dumbbells', 'kettlebell', 'ez_bar', 'trap_bar',
      'power_rack', 'flat_bench', 'incline_bench', 'lat_pulldown', 'low_row_pulley',
      'smith_machine', 'leg_press', 'cable_crossover', 'resistance_band', 'suspension_trainer',
      'pull_up_bar', 'dip_station', 'plyo_box', 'ab_wheel', 'bodyweight'
    ]);

    const ids = new Set<string>();

    for (const ex of EXERCISE_SEED_DATA) {
      expect(ex.id).toBeDefined();
      expect(typeof ex.id).toBe('string');
      expect(ids.has(ex.id)).toBe(false);
      ids.add(ex.id);

      expect(ex.name).toBeDefined();
      expect(typeof ex.name).toBe('string');
      expect(ex.name.trim().length).toBeGreaterThan(0);

      expect(validPatterns.has(ex.movement_pattern)).toBe(true);
      expect(validMuscles.has(ex.primary_muscle)).toBe(true);
      expect(validEquipments.has(ex.equipment_id)).toBe(true);

      expect(typeof ex.is_compound).toBe('boolean');
      expect(typeof ex.initial_load_ratio).toBe('number');
      expect(ex.initial_load_ratio).toBeGreaterThan(0);
      expect(ex.initial_load_ratio).toBeLessThanOrEqual(2.0);

      expect(typeof ex.video_url).toBe('string');
      expect(ex.video_url).toContain('youtube.com');
      expect(typeof ex.video_fallback_url).toBe('string');
      expect(typeof ex.instructions).toBe('string');
      expect(ex.is_active).toBe(true);
    }
  });

  it('should ensure each exercise has at least 2 biomechanically compatible alternatives (CA-09.2)', async () => {
    const { EXERCISE_SEED_DATA, EXERCISE_ALTERNATIVES_SEED_DATA } = await import(
      '../../src/db/seeds/exercises.seed.js'
    );

    expect(Array.isArray(EXERCISE_ALTERNATIVES_SEED_DATA)).toBe(true);

    const exerciseMap = new Map<string, (typeof EXERCISE_SEED_DATA)[0]>();
    for (const ex of EXERCISE_SEED_DATA) {
      exerciseMap.set(ex.id, ex);
    }

    const alternativesByOriginal = new Map<string, string[]>();

    for (const alt of EXERCISE_ALTERNATIVES_SEED_DATA) {
      expect(exerciseMap.has(alt.original_exercise_id)).toBe(true);
      expect(exerciseMap.has(alt.alternative_exercise_id)).toBe(true);
      expect(alt.original_exercise_id).not.toBe(alt.alternative_exercise_id);

      const orig = exerciseMap.get(alt.original_exercise_id)!;
      const target = exerciseMap.get(alt.alternative_exercise_id)!;

      // Same pattern & primary muscle
      expect(orig.movement_pattern).toBe(target.movement_pattern);
      expect(orig.primary_muscle).toBe(target.primary_muscle);

      expect(alt.similarity_score).toBeGreaterThanOrEqual(0.7);
      expect(alt.similarity_score).toBeLessThanOrEqual(1.0);

      const list = alternativesByOriginal.get(alt.original_exercise_id) || [];
      list.push(alt.alternative_exercise_id);
      alternativesByOriginal.set(alt.original_exercise_id, list);
    }

    for (const ex of EXERCISE_SEED_DATA) {
      const alts = alternativesByOriginal.get(ex.id) || [];
      expect(
        alts.length,
        `Exercise ${ex.id} (${ex.name}) has only ${alts.length} alternatives, expected >= 2`
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('should support seed execution via seedExercises and register npm run db:seed script', async () => {
    const { seedExercises } = await import('../../src/db/seeds/exercises.seed.js');
    expect(typeof seedExercises).toBe('function');

    const mockQuery = vi.fn().mockResolvedValue({ rowCount: 1 });
    const mockClient = { query: mockQuery as (text: string, params?: unknown[]) => Promise<unknown> };

    await seedExercises(mockClient);
    expect(mockQuery).toHaveBeenCalled();

    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
    const backendPkg = JSON.parse(fs.readFileSync(backendPkgPath, 'utf-8'));

    expect(backendPkg.scripts?.['db:seed']).toBeDefined();
    expect(rootPkg.scripts?.['db:seed']).toBeDefined();
  });
});
