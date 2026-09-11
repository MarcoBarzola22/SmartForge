import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getPendingMigrations, runMigrations } from '../../src/db/migrator.js';
import { pool } from '../../src/config/db.js';

describe('TASK-11: Database Pool and SQL Migrator', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const backendPkgPath = path.join(rootDir, 'backend', 'package.json');
  const rootPkgPath = path.join(rootDir, 'package.json');

  it('should define db:migrate scripts in package.json', () => {
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
    const backendPkg = JSON.parse(fs.readFileSync(backendPkgPath, 'utf-8'));

    expect(rootPkg.scripts).toHaveProperty('db:migrate');
    expect(backendPkg.scripts).toHaveProperty('db:migrate');
  });

  it('should export database pool configured with environment variables', () => {
    expect(pool).toBeDefined();
    expect(typeof pool.query).toBe('function');
    expect(typeof pool.connect).toBe('function');
  });

  it('should sort migration files in ascending order and filter already applied migrations', () => {
    const mockFiles = ['003_sessions.sql', '001_initial.sql', '002_catalog.sql'];
    const appliedMigrations = ['001_initial.sql'];

    const pending = getPendingMigrations(mockFiles, appliedMigrations);
    expect(pending).toEqual(['002_catalog.sql', '003_sessions.sql']);
  });

  it('should execute pending migrations in transaction and record in schema_migrations', async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((queryText: string) => {
        if (queryText.includes('SELECT filename FROM schema_migrations')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      }),
      release: vi.fn()
    };

    const mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient)
    } as unknown as typeof pool;

    const migrationsDir = path.join(__dirname, 'mock_migrations');
    fs.mkdirSync(migrationsDir, { recursive: true });
    fs.writeFileSync(
      path.join(migrationsDir, '001_test.sql'),
      'CREATE TABLE test_table (id SERIAL PRIMARY KEY);'
    );

    const result = await runMigrations(mockPool, migrationsDir);

    expect(result.appliedCount).toBe(1);
    expect(result.appliedFiles).toContain('001_test.sql');
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations')
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO schema_migrations'),
      ['001_test.sql']
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();

    // Clean up mock migrations directory
    fs.rmSync(migrationsDir, { recursive: true, force: true });
  });
});
