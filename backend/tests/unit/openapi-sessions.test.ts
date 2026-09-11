import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

describe('TASK-08: OpenAPI Sessions, Sets, Progression and Sync Specification', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const openapiPath = path.join(rootDir, 'contract', 'openapi.yaml');

  const getDoc = () => {
    const rawYaml = fs.readFileSync(openapiPath, 'utf-8');
    return yaml.parse(rawYaml);
  };

  it('should define session lifecycle and check-in endpoints', () => {
    const doc = getDoc();

    const createSession = doc.paths?.['/sessions']?.post;
    expect(createSession).toBeDefined();
    expect(createSession.operationId).toBe('createSession');
    expect(createSession.responses['201']).toBeDefined();

    const checkinOp = doc.paths?.['/sessions/{id}/checkin']?.post;
    expect(checkinOp).toBeDefined();
    expect(checkinOp.operationId).toBe('submitCheckIn');
    expect(checkinOp.responses['201']).toBeDefined();
    expect(checkinOp.responses['409']).toBeDefined();

    const completeOp = doc.paths?.['/sessions/{id}/complete']?.patch;
    expect(completeOp).toBeDefined();
    expect(completeOp.operationId).toBe('completeSession');
    expect(completeOp.responses['200']).toBeDefined();
  });

  it('should define set logging and pain report endpoints', () => {
    const doc = getDoc();

    const createSet = doc.paths?.['/sessions/{id}/sets']?.post;
    expect(createSet).toBeDefined();
    expect(createSet.operationId).toBe('logSet');
    expect(createSet.responses['201']).toBeDefined();

    const updateSet = doc.paths?.['/sets/{id}']?.put;
    expect(updateSet).toBeDefined();
    expect(updateSet.operationId).toBe('updateSetLog');
    expect(updateSet.responses['200']).toBeDefined();

    const deleteSet = doc.paths?.['/sets/{id}']?.delete;
    expect(deleteSet).toBeDefined();
    expect(deleteSet.operationId).toBe('deleteSetLog');
    expect(deleteSet.responses['204']).toBeDefined();

    const painOp = doc.paths?.['/sessions/{id}/pain-reports']?.post;
    expect(painOp).toBeDefined();
    expect(painOp.operationId).toBe('reportExercisePain');
    expect(painOp.responses['201']).toBeDefined();
  });

  it('should define progression and offline sync endpoints', () => {
    const doc = getDoc();

    const progOp = doc.paths?.['/assignments/{id}/progression']?.get;
    expect(progOp).toBeDefined();
    expect(progOp.operationId).toBe('getProgressionSuggestion');
    expect(progOp.responses['200']).toBeDefined();

    const syncOp = doc.paths?.['/sync']?.post;
    expect(syncOp).toBeDefined();
    expect(syncOp.operationId).toBe('syncOfflineData');
    expect(syncOp.responses['200']).toBeDefined();
  });

  it('should define CheckIn, SetLog, PainReport, Progression and Sync schemas', () => {
    const doc = getDoc();
    const schemas = doc.components?.schemas;
    expect(schemas).toBeDefined();

    expect(schemas.CheckInRequest).toBeDefined();
    expect(schemas.CheckInResponse).toBeDefined();
    expect(schemas.Joint).toBeDefined();
    expect(schemas.BodySide).toBeDefined();
    expect(schemas.PainIntensity).toBeDefined();

    expect(schemas.SetLog).toBeDefined();
    expect(schemas.CreateSetLogRequest).toBeDefined();
    expect(schemas.PainReport).toBeDefined();
    expect(schemas.TrainingSession).toBeDefined();
    expect(schemas.ProgressionSuggestion).toBeDefined();
    expect(schemas.SyncRequest).toBeDefined();
    expect(schemas.SyncResponse).toBeDefined();
  });
});
