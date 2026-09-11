import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

describe('TASK-06: OpenAPI Exercises and Alternatives Specification', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const openapiPath = path.join(rootDir, 'contract', 'openapi.yaml');

  const getDoc = () => {
    const rawYaml = fs.readFileSync(openapiPath, 'utf-8');
    return yaml.parse(rawYaml);
  };

  it('should define GET /exercises with filtering query parameters', () => {
    const doc = getDoc();
    const op = doc.paths?.['/exercises']?.get;
    expect(op).toBeDefined();
    expect(op.operationId).toBe('listExercises');
    expect(op.responses['200']).toBeDefined();

    const paramNames = op.parameters?.map((p: { name: string }) => p.name);
    expect(paramNames).toContain('pattern');
    expect(paramNames).toContain('primary_muscle');
    expect(paramNames).toContain('equipment_id');
    expect(paramNames).toContain('search');
  });

  it('should define GET /exercises/{id} with video and detail response', () => {
    const doc = getDoc();
    const op = doc.paths?.['/exercises/{id}']?.get;
    expect(op).toBeDefined();
    expect(op.operationId).toBe('getExerciseById');
    expect(op.responses['200']).toBeDefined();
    expect(op.responses['404']).toBeDefined();
  });

  it('should define GET /exercises/{id}/alternatives for swapping exercises', () => {
    const doc = getDoc();
    const op = doc.paths?.['/exercises/{id}/alternatives']?.get;
    expect(op).toBeDefined();
    expect(op.operationId).toBe('getExerciseAlternatives');
    expect(op.responses['200']).toBeDefined();
  });

  it('should define Exercise, ExerciseAlternative, MovementPattern and MuscleGroup schemas', () => {
    const doc = getDoc();
    const schemas = doc.components?.schemas;
    expect(schemas).toBeDefined();

    expect(schemas.Exercise).toBeDefined();
    expect(schemas.Exercise.properties).toHaveProperty('movement_pattern');
    expect(schemas.Exercise.properties).toHaveProperty('primary_muscle');
    expect(schemas.Exercise.properties).toHaveProperty('video_url');
    expect(schemas.Exercise.properties).toHaveProperty('initial_load_ratio');

    expect(schemas.ExerciseAlternative).toBeDefined();
    expect(schemas.MovementPattern).toBeDefined();
    expect(schemas.MovementPattern.enum).toEqual([
      'empuje',
      'tiron',
      'rodilla_dominante',
      'cadera_dominante',
      'core'
    ]);
    expect(schemas.MuscleGroup).toBeDefined();
  });
});
