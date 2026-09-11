import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

describe('TASK-07: OpenAPI Mesocycles and Assignments Specification', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const openapiPath = path.join(rootDir, 'contract', 'openapi.yaml');

  const getDoc = () => {
    const rawYaml = fs.readFileSync(openapiPath, 'utf-8');
    return yaml.parse(rawYaml);
  };

  it('should define POST /mesocycles and GET /mesocycles/current operations', () => {
    const doc = getDoc();

    const postOp = doc.paths?.['/mesocycles']?.post;
    expect(postOp).toBeDefined();
    expect(postOp.operationId).toBe('generateMesocycle');
    expect(postOp.responses['201']).toBeDefined();
    expect(postOp.responses['400']).toBeDefined();

    const currentOp = doc.paths?.['/mesocycles/current']?.get;
    expect(currentOp).toBeDefined();
    expect(currentOp.operationId).toBe('getCurrentMesocycle');
    expect(currentOp.responses['200']).toBeDefined();
    expect(currentOp.responses['404']).toBeDefined();
  });

  it('should define GET /mesocycles/{id} operation', () => {
    const doc = getDoc();
    const getByIdOp = doc.paths?.['/mesocycles/{id}']?.get;
    expect(getByIdOp).toBeDefined();
    expect(getByIdOp.operationId).toBe('getMesocycleById');
    expect(getByIdOp.responses['200']).toBeDefined();
    expect(getByIdOp.responses['404']).toBeDefined();
  });

  it('should define POST /assignments/{id}/swap for swapping exercises', () => {
    const doc = getDoc();
    const swapOp = doc.paths?.['/assignments/{id}/swap']?.post;
    expect(swapOp).toBeDefined();
    expect(swapOp.operationId).toBe('swapExerciseAssignment');
    expect(swapOp.responses['200']).toBeDefined();
    expect(swapOp.responses['400']).toBeDefined();
    expect(swapOp.responses['404']).toBeDefined();
  });

  it('should define MesocycleDetail, WeekPlan, SessionPlan, ExerciseAssignment, SwapExerciseRequest and Enum schemas', () => {
    const doc = getDoc();
    const schemas = doc.components?.schemas;
    expect(schemas).toBeDefined();

    expect(schemas.MesocycleDetail).toBeDefined();
    expect(schemas.WeekPlan).toBeDefined();
    expect(schemas.SessionPlan).toBeDefined();
    expect(schemas.ExerciseAssignment).toBeDefined();
    expect(schemas.SwapExerciseRequest).toBeDefined();

    expect(schemas.PeriodizationType).toBeDefined();
    expect(schemas.PeriodizationType.enum).toEqual(['lineal', 'ondulante']);

    expect(schemas.SwapReason).toBeDefined();
    expect(schemas.SwapReason.enum).toEqual([
      'falta_equipamiento',
      'preferencia_personal',
      'molestia_articular'
    ]);
  });
});
