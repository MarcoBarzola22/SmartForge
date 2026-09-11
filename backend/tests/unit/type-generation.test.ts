import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('TASK-09: Zod Schema and TypeScript Type Generation', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const backendGeneratedPath = path.join(
    rootDir,
    'backend',
    'src',
    'schemas',
    'generated',
    'schemas.ts'
  );
  const frontendGeneratedPath = path.join(rootDir, 'frontend', 'src', 'api', 'generated', 'types.ts');
  const packageJsonPath = path.join(rootDir, 'package.json');

  it('should define generate:types script in root package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    expect(pkg.scripts).toHaveProperty('generate:types');
  });

  it('should generate backend Zod schemas from openapi.yaml', () => {
    expect(fs.existsSync(backendGeneratedPath)).toBe(true);
    const content = fs.readFileSync(backendGeneratedPath, 'utf-8');
    expect(content).toContain('export const CreateProfileRequestSchema');
    expect(content).toContain('export const AthleteProfileSchema');
    expect(content).toContain('export const CheckInRequestSchema');
    expect(content).toContain('export const CreateSetLogRequestSchema');
    expect(content).toContain('export const ExerciseSchema');
    expect(content).toContain('export const MesocycleDetailSchema');
  });

  it('should generate frontend TypeScript types/schemas from openapi.yaml', () => {
    expect(fs.existsSync(frontendGeneratedPath)).toBe(true);
    const content = fs.readFileSync(frontendGeneratedPath, 'utf-8');
    expect(content).toContain('export type AthleteProfile');
    expect(content).toContain('export type CreateProfileRequest');
    expect(content).toContain('export type CheckInRequest');
    expect(content).toContain('export type SetLog');
    expect(content).toContain('export type MesocycleDetail');
  });

  it('should validate schemas at runtime using generated Zod definitions', async () => {
    if (!fs.existsSync(backendGeneratedPath)) {
      throw new Error('backendGeneratedPath does not exist');
    }
    const { CreateProfileRequestSchema, CreateSetLogRequestSchema } = await import(
      '../../src/schemas/generated/schemas.js'
    );

    // Valid profile
    const validProfile = {
      name: 'Carlos Ruiz',
      age: 22,
      weight_kg: 75.0,
      experience_level: 'intermedio',
      training_goal: 'hipertrofia',
      available_days_per_week: 4,
      equipment_ids: ['barbell', 'dumbbells']
    };
    const validResult = CreateProfileRequestSchema.safeParse(validProfile);
    expect(validResult.success).toBe(true);

    // Invalid profile (age < 16)
    const invalidProfile = { ...validProfile, age: 14 };
    const invalidResult = CreateProfileRequestSchema.safeParse(invalidProfile);
    expect(invalidResult.success).toBe(false);

    // Invalid set log (RIR > 5)
    const invalidSet = {
      exercise_id: 'barbell_bench_press',
      set_number: 1,
      reps_completed: 10,
      weight_kg: 60,
      rir: 7, // Invalid!
      client_timestamp: new Date().toISOString()
    };
    const invalidSetResult = CreateSetLogRequestSchema.safeParse(invalidSet);
    expect(invalidSetResult.success).toBe(false);
  });
});
