import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('TASK-14: Mesocycles and Plans Schema Migration (003_mesocycles_and_plans.sql)', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const migrationPath = path.join(
    rootDir,
    'backend',
    'src',
    'db',
    'migrations',
    '003_mesocycles_and_plans.sql'
  );

  it('should have 003_mesocycles_and_plans.sql migration file', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('should create mesocycle, week_plan, session_plan, exercise_assignment and exercise_swap tables', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS mesocycle');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS week_plan');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS session_plan');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS exercise_assignment');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS exercise_swap');
  });

  it('should configure cascading deletes for plan hierarchy and ON DELETE RESTRICT for master exercises', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Cascade deletes in plan hierarchy
    expect(sql).toMatch(/REFERENCES\s+athlete\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i);
    expect(sql).toMatch(/REFERENCES\s+mesocycle\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i);
    expect(sql).toMatch(/REFERENCES\s+week_plan\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i);
    expect(sql).toMatch(/REFERENCES\s+session_plan\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i);
    expect(sql).toMatch(/REFERENCES\s+exercise_assignment\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i);

    // Restrict deletes on exercise master table (Constitución §5)
    expect(sql).toMatch(/REFERENCES\s+exercise\s*\(\s*id\s*\)\s+ON\s+DELETE\s+RESTRICT/i);
  });

  it('should enforce duration_weeks 4-8, RIR 0-5, and swap reason constraints', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    expect(sql).toMatch(/duration_weeks\s+INT(EGER)?\s+NOT\s+NULL\s+CHECK\s*\(\s*duration_weeks\s+BETWEEN\s+4\s+AND\s+8\s*\)/i);
    expect(sql).toMatch(/target_rir\s+INT(EGER)?\s+NOT\s+NULL\s+CHECK\s*\(\s*target_rir\s+BETWEEN\s+0\s+AND\s+5\s*\)/i);
    expect(sql).toContain("'falta_equipamiento'");
    expect(sql).toContain("'preferencia_personal'");
    expect(sql).toContain("'molestia_articular'");
  });

  it('should create indexes for athlete mesocycles and plan lookups', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain('idx_mesocycle_athlete_status');
    expect(sql).toContain('idx_week_plan_mesocycle_id');
    expect(sql).toContain('idx_session_plan_week_plan_id');
    expect(sql).toContain('idx_exercise_assignment_session_plan_id');
    expect(sql).toContain('idx_exercise_assignment_exercise_id');
    expect(sql).toContain('idx_exercise_swap_assignment_id');
  });
});
