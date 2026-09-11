import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('TASK-12: Initial Schema Migration (001_initial_schema.sql)', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const migrationPath = path.join(
    rootDir,
    'backend',
    'src',
    'db',
    'migrations',
    '001_initial_schema.sql'
  );

  it('should have 001_initial_schema.sql migration file', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('should create equipment, athlete, and athlete_equipment tables with explicit constraints', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Tables
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS equipment');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS athlete');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS athlete_equipment');

    // Age constraint >= 16 (RF-01)
    expect(sql).toMatch(/age\s+INT(EGER)?\s+NOT\s+NULL\s+CHECK\s*\(\s*age\s*>=\s*16\s*\)/i);

    // Weight and goal constraints
    expect(sql).toMatch(/weight_kg\s+NUMERIC/i);
    expect(sql).toContain("'principiante'");
    expect(sql).toContain("'intermedio'");
    expect(sql).toContain("'avanzado'");
    expect(sql).toContain("'hipertrofia'");
    expect(sql).toContain("'fuerza'");
    expect(sql).toContain("'mixto'");

    // Explicit FKs and ON DELETE (Constitución §5)
    expect(sql).toMatch(/REFERENCES\s+athlete\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i);
    expect(sql).toMatch(/REFERENCES\s+equipment\s*\(\s*id\s*\)\s+ON\s+DELETE\s+RESTRICT/i);
  });

  it('should create indexes for fast lookups and soft-delete filtering', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain('idx_athlete_google_id');
    expect(sql).toContain('idx_athlete_email');
    expect(sql).toContain('idx_athlete_equipment_athlete_id');
  });
});
