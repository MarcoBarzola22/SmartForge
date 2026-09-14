import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

describe('TASK-08: OpenAPI Mesocycles V2, Cancellation and History Specification', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const openapiPath = path.join(rootDir, 'contract', 'openapi.yaml');

  const getDoc = () => {
    const rawYaml = fs.readFileSync(openapiPath, 'utf-8');
    return yaml.parse(rawYaml);
  };

  it('should define POST /mesocycles accepting V2 parameters sessionDurationMinutes and exercisesPerSessionPreference', () => {
    const doc = getDoc();
    const postOp = doc.paths?.['/mesocycles']?.post;
    expect(postOp).toBeDefined();

    const requestBodySchema = postOp.requestBody?.content?.['application/json']?.schema;
    expect(requestBodySchema).toBeDefined();

    // Resolving schema (direct properties or $ref)
    let schemaObj = requestBodySchema;
    if (schemaObj.$ref) {
      const refName = schemaObj.$ref.replace('#/components/schemas/', '');
      schemaObj = doc.components?.schemas?.[refName];
    }

    expect(schemaObj.properties?.sessionDurationMinutes).toBeDefined();
    expect(schemaObj.properties?.exercisesPerSessionPreference).toBeDefined();
    expect(schemaObj.properties.sessionDurationMinutes.enum).toEqual([
      30, 45, 60, 75, 90, 120,
    ]);
  });

  it('should define POST /mesocycles/active/cancel endpoint', () => {
    const doc = getDoc();
    const cancelOp = doc.paths?.['/mesocycles/active/cancel']?.post;
    expect(cancelOp).toBeDefined();
    expect(cancelOp.operationId).toBe('cancelActiveMesocycle');
    expect(cancelOp.tags).toContain('Mesocycles');
    expect(cancelOp.responses['200']).toBeDefined();
    expect(cancelOp.responses['401']).toBeDefined();
    expect(cancelOp.responses['404']).toBeDefined();
  });

  it('should define GET /mesocycles/history endpoint', () => {
    const doc = getDoc();
    const historyOp = doc.paths?.['/mesocycles/history']?.get;
    expect(historyOp).toBeDefined();
    expect(historyOp.operationId).toBe('getMesocycleHistory');
    expect(historyOp.tags).toContain('Mesocycles');
    expect(historyOp.responses['200']).toBeDefined();
    expect(historyOp.responses['401']).toBeDefined();
  });

  it('should define MesocycleCreateV2Input and MesocycleHistoryItem schemas', () => {
    const doc = getDoc();
    const schemas = doc.components?.schemas;
    expect(schemas).toBeDefined();

    // MesocycleCreateV2Input
    expect(schemas.MesocycleCreateV2Input).toBeDefined();
    expect(schemas.MesocycleCreateV2Input.required).toContain('sessionDurationMinutes');
    expect(schemas.MesocycleCreateV2Input.required).toContain('exercisesPerSessionPreference');

    // MesocycleHistoryItem
    expect(schemas.MesocycleHistoryItem).toBeDefined();
    expect(schemas.MesocycleHistoryItem.required).toContain('id');
    expect(schemas.MesocycleHistoryItem.required).toContain('name');
    expect(schemas.MesocycleHistoryItem.required).toContain('goal');
    expect(schemas.MesocycleHistoryItem.required).toContain('startDate');
    expect(schemas.MesocycleHistoryItem.required).toContain('status');
    expect(schemas.MesocycleHistoryItem.required).toContain('adherencePercent');
    expect(schemas.MesocycleHistoryItem.required).toContain('exerciseProgressions');

    const progressions = schemas.MesocycleHistoryItem.properties.exerciseProgressions;
    expect(progressions.type).toBe('array');
    let progItem = progressions.items;
    if (progItem.$ref) {
      const refName = progItem.$ref.replace('#/components/schemas/', '');
      progItem = schemas[refName];
    }
    expect(progItem.required).toContain('exerciseId');
    expect(progItem.required).toContain('loadType');
    expect(progItem.required).toContain('baseline');
    expect(progItem.required).toContain('final');
  });
});
