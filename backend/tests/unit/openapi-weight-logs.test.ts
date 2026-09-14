import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

describe('TASK-06: OpenAPI Weight Logs Specification', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const openapiPath = path.join(rootDir, 'contract', 'openapi.yaml');

  const getDoc = () => {
    const rawYaml = fs.readFileSync(openapiPath, 'utf-8');
    return yaml.parse(rawYaml);
  };

  it('should define GET /athletes/me/weight-logs operation', () => {
    const doc = getDoc();
    const op = doc.paths?.['/athletes/me/weight-logs']?.get;
    expect(op).toBeDefined();
    expect(op.operationId).toBe('getWeightLogs');
    expect(op.tags).toContain('BodyWeight');
    expect(op.responses['200']).toBeDefined();
    expect(op.responses['401']).toBeDefined();
  });

  it('should define POST /athletes/me/weight-logs operation with 30-300kg validation and collision handling', () => {
    const doc = getDoc();
    const op = doc.paths?.['/athletes/me/weight-logs']?.post;
    expect(op).toBeDefined();
    expect(op.operationId).toBe('createWeightLog');
    expect(op.tags).toContain('BodyWeight');
    expect(op.requestBody).toBeDefined();
    expect(op.responses['201']).toBeDefined();
    expect(op.responses['400']).toBeDefined();
    expect(op.responses['401']).toBeDefined();
    expect(op.responses['409']).toBeDefined();
  });

  it('should define PUT /athletes/me/weight-logs/{id} operation', () => {
    const doc = getDoc();
    const op = doc.paths?.['/athletes/me/weight-logs/{id}']?.put;
    expect(op).toBeDefined();
    expect(op.operationId).toBe('updateWeightLog');
    expect(op.tags).toContain('BodyWeight');
    expect(op.parameters).toBeDefined();
    const idParam = op.parameters.find((p: any) => p.name === 'id');
    expect(idParam).toBeDefined();
    expect(idParam.in).toBe('path');
    expect(idParam.required).toBe(true);
    expect(op.responses['200']).toBeDefined();
    expect(op.responses['400']).toBeDefined();
    expect(op.responses['401']).toBeDefined();
    expect(op.responses['404']).toBeDefined();
    expect(op.responses['409']).toBeDefined();
  });

  it('should define schemas: CreateWeightLogRequest, UpdateWeightLogRequest, WeightLogItem, WeightLogResponse, WeightLogListResponse', () => {
    const doc = getDoc();
    const schemas = doc.components?.schemas;
    expect(schemas).toBeDefined();

    expect(schemas.CreateWeightLogRequest).toBeDefined();
    expect(schemas.CreateWeightLogRequest.required).toContain('weight_kg');
    expect(schemas.CreateWeightLogRequest.required).toContain('logged_date');
    expect(schemas.CreateWeightLogRequest.properties.weight_kg.minimum).toBe(30.0);
    expect(schemas.CreateWeightLogRequest.properties.weight_kg.maximum).toBe(300.0);

    expect(schemas.UpdateWeightLogRequest).toBeDefined();
    expect(schemas.UpdateWeightLogRequest.required).toContain('weight_kg');
    expect(schemas.UpdateWeightLogRequest.properties.weight_kg.minimum).toBe(30.0);
    expect(schemas.UpdateWeightLogRequest.properties.weight_kg.maximum).toBe(300.0);

    expect(schemas.WeightLogItem).toBeDefined();
    expect(schemas.WeightLogItem.required).toContain('id');
    expect(schemas.WeightLogItem.required).toContain('athlete_id');
    expect(schemas.WeightLogItem.required).toContain('weight_kg');
    expect(schemas.WeightLogItem.required).toContain('calendar_week_start');
    expect(schemas.WeightLogItem.required).toContain('logged_date');

    expect(schemas.WeightLogResponse).toBeDefined();
    expect(schemas.WeightLogListResponse).toBeDefined();
  });
});
