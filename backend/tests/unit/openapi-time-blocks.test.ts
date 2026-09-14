import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

describe('TASK-07: OpenAPI Routine Time Blocks Configuration Specification', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const openapiPath = path.join(rootDir, 'contract', 'openapi.yaml');

  const getDoc = () => {
    const rawYaml = fs.readFileSync(openapiPath, 'utf-8');
    return yaml.parse(rawYaml);
  };

  it('should define GET /routines/config/time-blocks operation', () => {
    const doc = getDoc();
    const op = doc.paths?.['/routines/config/time-blocks']?.get;
    expect(op).toBeDefined();
    expect(op.operationId).toBe('getTimeBlockConfig');
    expect(op.tags).toContain('Routines');
    expect(op.responses['200']).toBeDefined();
    expect(op.responses['401']).toBeDefined();
  });

  it('should define RoutineTimeBlockItem and RoutineTimeBlockConfigResponse schemas', () => {
    const doc = getDoc();
    const schemas = doc.components?.schemas;
    expect(schemas).toBeDefined();

    expect(schemas.RoutineTimeBlockItem).toBeDefined();
    expect(schemas.RoutineTimeBlockItem.required).toContain('duration_minutes');
    expect(schemas.RoutineTimeBlockItem.required).toContain('min_exercises');
    expect(schemas.RoutineTimeBlockItem.required).toContain('max_exercises');
    expect(schemas.RoutineTimeBlockItem.required).toContain('recommended_exercises');

    expect(schemas.RoutineTimeBlockItem.properties.duration_minutes.enum).toEqual([
      30, 45, 60, 75, 90, 120,
    ]);

    expect(schemas.RoutineTimeBlockConfigResponse).toBeDefined();
    expect(schemas.RoutineTimeBlockConfigResponse.required).toContain('available_blocks');
  });
});
