import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('TASK-09: OpenAPI Compilation and Generated Zod Schemas V2', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const backendGeneratedPath = path.join(
    rootDir,
    'backend',
    'src',
    'schemas',
    'generated',
    'schemas.ts'
  );
  const frontendGeneratedPath = path.join(
    rootDir,
    'frontend',
    'src',
    'api',
    'generated',
    'types.ts'
  );

  it('should export all required Epic 003 Zod schemas and TypeScript types in backend', () => {
    expect(fs.existsSync(backendGeneratedPath)).toBe(true);
    const content = fs.readFileSync(backendGeneratedPath, 'utf-8');

    expect(content).toContain('export const WeightLogInputSchema');
    expect(content).toContain('export type WeightLogInput');

    expect(content).toContain('export const RoutineTimeBlockConfigSchema');
    expect(content).toContain('export type RoutineTimeBlockConfig');

    expect(content).toContain('export const MesocycleCreateV2InputSchema');
    expect(content).toContain('export type MesocycleCreateV2Input');

    expect(content).toContain('export const MesocycleHistoryItemSchema');
    expect(content).toContain('export type MesocycleHistoryItem');
  });

  it('should export all required Epic 003 TypeScript types in frontend', () => {
    expect(fs.existsSync(frontendGeneratedPath)).toBe(true);
    const content = fs.readFileSync(frontendGeneratedPath, 'utf-8');

    expect(content).toContain('export type WeightLogInput');
    expect(content).toContain('export type RoutineTimeBlockConfig');
    expect(content).toContain('export type MesocycleCreateV2Input');
    expect(content).toContain('export type MesocycleHistoryItem');
  });

  it('should validate MesocycleCreateV2InputSchema at runtime', async () => {
    const { MesocycleCreateV2InputSchema } = await import(
      '../../src/schemas/generated/schemas.js'
    );

    // Valid V2 input with recommended mode
    const validRecommended = {
      availableDays: 4,
      sessionDurationMinutes: 60,
      exercisesPerSessionPreference: {
        mode: 'recommended',
      },
    };
    const resRec = MesocycleCreateV2InputSchema.safeParse(validRecommended);
    expect(resRec.success).toBe(true);

    // Valid V2 input with manual mode
    const validManual = {
      availableDays: 3,
      sessionDurationMinutes: 45,
      exercisesPerSessionPreference: {
        mode: 'manual',
        customCount: 3,
      },
    };
    const resMan = MesocycleCreateV2InputSchema.safeParse(validManual);
    expect(resMan.success).toBe(true);

    // Invalid session duration (50 is not in 30, 45, 60, 75, 90, 120)
    const invalidDuration = {
      ...validRecommended,
      sessionDurationMinutes: 50,
    };
    const resDur = MesocycleCreateV2InputSchema.safeParse(invalidDuration);
    expect(resDur.success).toBe(false);

    // Invalid available days (0 or 8)
    const invalidDays = {
      ...validRecommended,
      availableDays: 8,
    };
    const resDays = MesocycleCreateV2InputSchema.safeParse(invalidDays);
    expect(resDays.success).toBe(false);
  });

  it('should validate WeightLogInputSchema and RoutineTimeBlockConfigSchema at runtime', async () => {
    const { WeightLogInputSchema, RoutineTimeBlockConfigSchema } = await import(
      '../../src/schemas/generated/schemas.js'
    );

    // Valid weight log input
    const validWeight = {
      weightKg: 74.5,
      loggedDate: '2026-09-14',
    };
    const resWeight = WeightLogInputSchema.safeParse(validWeight);
    expect(resWeight.success).toBe(true);

    // Invalid weight log (below 30kg)
    const invalidWeight = {
      weightKg: 25.0,
      loggedDate: '2026-09-14',
    };
    const resInvWeight = WeightLogInputSchema.safeParse(invalidWeight);
    expect(resInvWeight.success).toBe(false);

    // Valid time block config
    const validConfig = {
      availableBlocks: [
        {
          duration_minutes: 60,
          min_exercises: 2,
          max_exercises: 5,
          recommended_exercises: 4,
        },
      ],
    };
    const resConfig = RoutineTimeBlockConfigSchema.safeParse(validConfig);
    expect(resConfig.success).toBe(true);
  });

  it('should validate MesocycleHistoryItemSchema at runtime', async () => {
    const { MesocycleHistoryItemSchema } = await import(
      '../../src/schemas/generated/schemas.js'
    );

    const validHistoryItem = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'Mesociclo 1 - Hipertrofia V2',
      goal: 'hipertrofia',
      startDate: '2026-08-01',
      endDate: '2026-09-12',
      status: 'completed',
      adherencePercent: 95,
      adherenceDetails: 'Semana 6 de 6 completada',
      exerciseProgressions: [
        {
          exerciseId: 'pull_up',
          exerciseName: 'Dominadas pronas',
          loadType: 'bodyweight_loadable',
          baseline: {
            loadText: '75.0 kg (PC) + 0 kg × 6 reps',
            e1rmKg: 87.2,
          },
          final: {
            loadText: '73.5 kg (PC) + 10 kg × 8 reps',
            e1rmKg: 98.4,
            executed: true,
          },
          progress: {
            deltaKg: 11.2,
            deltaPercent: 12.8,
          },
        },
      ],
    };

    const resHist = MesocycleHistoryItemSchema.safeParse(validHistoryItem);
    expect(resHist.success).toBe(true);

    // Invalid status (e.g. unknown status)
    const invalidHist = {
      ...validHistoryItem,
      status: 'in_progress_invalid',
    };
    const resInvHist = MesocycleHistoryItemSchema.safeParse(invalidHist);
    expect(resInvHist.success).toBe(false);
  });
});
