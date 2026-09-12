import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import type { PoolLike } from '../../src/repositories/athlete.repository.js';

describe('TASK-21: Athlete Repository (backend/src/repositories/athlete.repository.ts)', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const repoFilePath = path.join(
    rootDir,
    'backend',
    'src',
    'repositories',
    'athlete.repository.ts'
  );

  const mockAthleteRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    google_id: 'google_123456789',
    email: 'atleta@example.com',
    name: 'Juan Pérez',
    age: 25,
    weight_kg: '78.50',
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    created_at: new Date('2026-09-01T10:00:00Z'),
    updated_at: new Date('2026-09-01T10:00:00Z'),
    deleted_at: null
  };

  const mockEquipmentRows = [
    { id: 'barbell', name: 'Barra olímpica', category: 'free_weights' },
    { id: 'dumbbells', name: 'Mancuernas', category: 'free_weights' }
  ];

  it('should have athlete.repository.ts file created', () => {
    expect(fs.existsSync(repoFilePath)).toBe(true);
  });

  it('should create athlete and equipment atomically in a transaction', async () => {
    const { AthleteRepository } = await import('../../src/repositories/athlete.repository.js');

    const mockClient = {
      query: vi.fn().mockImplementation(async (sql: string) => {
        if (sql.includes('INSERT INTO athlete (')) {
          return { rows: [mockAthleteRow] };
        }
        if (sql.includes('SELECT e.id, e.name, e.category')) {
          return { rows: mockEquipmentRows };
        }
        return { rows: [] };
      }),
      release: vi.fn()
    };

    const mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
      query: vi.fn()
    };

    const repo = new AthleteRepository(mockPool as unknown as PoolLike);

    const created = await repo.create(
      {
        google_id: 'google_123456789',
        email: 'atleta@example.com',
        name: 'Juan Pérez',
        age: 25,
        weight_kg: 78.5,
        experience_level: 'intermedio',
        training_goal: 'hipertrofia',
        available_days_per_week: 4
      },
      ['barbell', 'dumbbells']
    );

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
    expect(created.id).toBe(mockAthleteRow.id);
    expect(created.equipment).toHaveLength(2);
    expect(created.equipment[0]?.id).toBe('barbell');
  });

  it('should find active athlete by ID, Google ID or Email with equipment relations', async () => {
    const { AthleteRepository } = await import('../../src/repositories/athlete.repository.js');

    const mockPool = {
      connect: vi.fn(),
      query: vi.fn().mockImplementation(async (sql: string, params?: unknown[]) => {
        if (sql.includes('FROM athlete') && params && params[0] === '123e4567-e89b-12d3-a456-426614174000') {
          return { rows: [mockAthleteRow] };
        }
        if (sql.includes('FROM athlete') && params && params[0] === 'google_123456789') {
          return { rows: [mockAthleteRow] };
        }
        if (sql.includes('FROM athlete') && params && params[0] === 'atleta@example.com') {
          return { rows: [mockAthleteRow] };
        }
        if (sql.includes('SELECT e.id, e.name, e.category')) {
          return { rows: mockEquipmentRows };
        }
        return { rows: [] };
      })
    };

    const repo = new AthleteRepository(mockPool as unknown as PoolLike);

    const byId = await repo.findById('123e4567-e89b-12d3-a456-426614174000');
    expect(byId).not.toBeNull();
    expect(byId?.email).toBe('atleta@example.com');
    expect(byId?.equipment).toHaveLength(2);

    const byGoogle = await repo.findByGoogleId('google_123456789');
    expect(byGoogle).not.toBeNull();
    expect(byGoogle?.id).toBe(mockAthleteRow.id);

    const byEmail = await repo.findByEmail('atleta@example.com');
    expect(byEmail).not.toBeNull();
    expect(byEmail?.google_id).toBe('google_123456789');

    const notFound = await repo.findById('non_existent');
    expect(notFound).toBeNull();
  });

  it('should update athlete profile and synchronize equipment in a transaction', async () => {
    const { AthleteRepository } = await import('../../src/repositories/athlete.repository.js');

    const updatedAthleteRow = { ...mockAthleteRow, weight_kg: '80.00', available_days_per_week: 5 };

    const mockClient = {
      query: vi.fn().mockImplementation(async (sql: string) => {
        if (sql.includes('UPDATE athlete')) {
          return { rows: [updatedAthleteRow] };
        }
        if (sql.includes('SELECT e.id, e.name, e.category')) {
          return { rows: [mockEquipmentRows[0]] };
        }
        return { rows: [] };
      }),
      release: vi.fn()
    };

    const mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
      query: vi.fn()
    };

    const repo = new AthleteRepository(mockPool as unknown as PoolLike);

    const updated = await repo.update(
      mockAthleteRow.id,
      { weight_kg: 80.0, available_days_per_week: 5 },
      ['barbell']
    );

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
    expect(updated).not.toBeNull();
    expect(updated?.weight_kg).toBe(80.0);
    expect(updated?.available_days_per_week).toBe(5);
    expect(updated?.equipment).toHaveLength(1);
  });

  it('should soft delete athlete by setting deleted_at timestamp', async () => {
    const { AthleteRepository } = await import('../../src/repositories/athlete.repository.js');

    const mockPool = {
      connect: vi.fn(),
      query: vi.fn().mockImplementation(async (sql: string, params?: unknown[]) => {
        if (sql.includes('UPDATE athlete') && sql.includes('deleted_at = NOW()') && params && params[0] === mockAthleteRow.id) {
          return { rowCount: 1, rows: [] };
        }
        return { rowCount: 0, rows: [] };
      })
    };

    const repo = new AthleteRepository(mockPool as unknown as PoolLike);

    const deleted = await repo.softDelete(mockAthleteRow.id);
    expect(deleted).toBe(true);

    const notDeleted = await repo.softDelete('unknown_id');
    expect(notDeleted).toBe(false);
  });
});
