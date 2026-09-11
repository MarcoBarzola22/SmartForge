import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('TASK-13: Exercise Catalog Schema Migration (002_exercise_catalog.sql)', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const migrationPath = path.join(
    rootDir,
    'backend',
    'src',
    'db',
    'migrations',
    '002_exercise_catalog.sql'
  );

  it('should have 002_exercise_catalog.sql migration file', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('should create exercise and exercise_alternative tables with proper types and constraints', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Tables
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS exercise');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS exercise_alternative');

    // Pattern and muscle constraints
    expect(sql).toContain("'empuje'");
    expect(sql).toContain("'tiron'");
    expect(sql).toContain("'rodilla_dominante'");
    expect(sql).toContain("'cadera_dominante'");
    expect(sql).toContain("'core'");
    expect(sql).toContain("'pecho'");
    expect(sql).toContain("'espalda'");

    // Array support for secondary muscles
    expect(sql).toMatch(/secondary_muscles\s+TEXT\[\]/i);

    // Foreign keys with explicit ON DELETE (Constitución §5)
    expect(sql).toMatch(/REFERENCES\s+equipment\s*\(\s*id\s*\)\s+ON\s+DELETE\s+RESTRICT/i);
    expect(sql).toMatch(/REFERENCES\s+exercise\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i);

    // Composite primary key and check constraint
    expect(sql).toMatch(/PRIMARY\s+KEY\s*\(\s*original_exercise_id\s*,\s*alternative_exercise_id\s*\)/i);
    expect(sql).toMatch(/similarity_score\s+NUMERIC/i);
  });

  it('should create indexes for pattern, muscle, equipment and alternatives', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain('idx_exercise_movement_pattern');
    expect(sql).toContain('idx_exercise_primary_muscle');
    expect(sql).toContain('idx_exercise_equipment_id');
    expect(sql).toContain('idx_exercise_alternative_original');
  });
});
