import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('TASK-15: Sessions, Check-ins, Sets and Pain Reports Schema Migration (004_sessions_and_logs.sql)', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const migrationPath = path.join(
    rootDir,
    'backend',
    'src',
    'db',
    'migrations',
    '004_sessions_and_logs.sql'
  );

  it('should have 004_sessions_and_logs.sql migration file', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('should create session, checkin, checkin_pain, set_log and exercise_pain_report tables', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS session');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS checkin');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS checkin_pain');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS set_log');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS exercise_pain_report');
  });

  it('should enforce validation constraints: fatigue_level 1-5, rir 0-5, weight_kg >= 0, reps_completed >= 0', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    expect(sql).toMatch(/fatigue_level\s+INT(EGER)?\s+NOT\s+NULL\s+CHECK\s*\(\s*fatigue_level\s+BETWEEN\s+1\s+AND\s+5\s*\)/i);
    expect(sql).toMatch(/rir\s+INT(EGER)?\s+NOT\s+NULL\s+CHECK\s*\(\s*rir\s+BETWEEN\s+0\s+AND\s+5\s*\)/i);
    expect(sql).toMatch(/weight_kg\s+NUMERIC\(\d+,\s*\d+\)\s+NOT\s+NULL\s+DEFAULT\s+0(\.0+)?\s+CHECK\s*\(\s*weight_kg\s*>=\s*0\s*\)/i);
    expect(sql).toMatch(/reps_completed\s+INT(EGER)?\s+NOT\s+NULL\s+CHECK\s*\(\s*reps_completed\s*>=\s*0\s*\)/i);
    expect(sql).toContain("'in_progress'");
    expect(sql).toContain("'completed'");
    expect(sql).toContain("'cancelled'");
    expect(sql).toContain("'hombro'");
    expect(sql).toContain("'rodilla'");
  });

  it('should configure proper foreign keys with CASCADE for logs and ON DELETE RESTRICT for master exercises', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Cascading deletes for session and logs
    expect(sql).toMatch(/REFERENCES\s+athlete\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i);
    expect(sql).toMatch(/REFERENCES\s+session\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i);
    expect(sql).toMatch(/REFERENCES\s+checkin\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i);

    // Set null if session plan is modified/deleted
    expect(sql).toMatch(/REFERENCES\s+session_plan\s*\(\s*id\s*\)\s+ON\s+DELETE\s+SET\s+NULL/i);

    // Restrict deletes on exercise master table (Constitución §5)
    expect(sql).toMatch(/REFERENCES\s+exercise\s*\(\s*id\s*\)\s+ON\s+DELETE\s+RESTRICT/i);
  });

  it('should create client_timestamp indexes on all log and sync entities', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain('idx_session_client_timestamp');
    expect(sql).toContain('idx_checkin_client_timestamp');
    expect(sql).toContain('idx_checkin_pain_client_timestamp');
    expect(sql).toContain('idx_set_log_client_timestamp');
    expect(sql).toContain('idx_exercise_pain_report_client_timestamp');
  });
});
