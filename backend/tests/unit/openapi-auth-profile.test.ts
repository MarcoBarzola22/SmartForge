import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

describe('TASK-05: OpenAPI Auth and Profile Specification', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const openapiPath = path.join(rootDir, 'contract', 'openapi.yaml');

  const getDoc = () => {
    const rawYaml = fs.readFileSync(openapiPath, 'utf-8');
    return yaml.parse(rawYaml);
  };

  it('should define GET /auth/me operation', () => {
    const doc = getDoc();
    const op = doc.paths?.['/auth/me']?.get;
    expect(op).toBeDefined();
    expect(op.operationId).toBe('getCurrentUser');
    expect(op.responses['200']).toBeDefined();
    expect(op.responses['401']).toBeDefined();
  });

  it('should define POST /profile, PUT /profile, and DELETE /profile operations', () => {
    const doc = getDoc();
    const postOp = doc.paths?.['/profile']?.post;
    const putOp = doc.paths?.['/profile']?.put;
    const deleteOp = doc.paths?.['/profile']?.delete;

    expect(postOp).toBeDefined();
    expect(postOp.operationId).toBe('createProfile');
    expect(postOp.responses['201']).toBeDefined();
    expect(postOp.responses['400']).toBeDefined();
    expect(postOp.responses['409']).toBeDefined();

    expect(putOp).toBeDefined();
    expect(putOp.operationId).toBe('updateProfile');
    expect(putOp.responses['200']).toBeDefined();
    expect(putOp.responses['400']).toBeDefined();

    expect(deleteOp).toBeDefined();
    expect(deleteOp.operationId).toBe('deleteProfile');
    expect(deleteOp.responses['200']).toBeDefined();
  });

  it('should define AthleteProfile, CreateProfileRequest, UpdateProfileRequest and Enum schemas', () => {
    const doc = getDoc();
    const schemas = doc.components?.schemas;
    expect(schemas).toBeDefined();

    expect(schemas.AthleteProfile).toBeDefined();
    expect(schemas.CreateProfileRequest).toBeDefined();
    expect(schemas.UpdateProfileRequest).toBeDefined();
    expect(schemas.ExperienceLevel).toBeDefined();
    expect(schemas.ExperienceLevel.enum).toEqual(['principiante', 'intermedio', 'avanzado']);
    expect(schemas.TrainingGoal).toBeDefined();
    expect(schemas.TrainingGoal.enum).toEqual(['hipertrofia', 'fuerza', 'mixto']);
  });
});
