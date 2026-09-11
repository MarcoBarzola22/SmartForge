import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MigrationResult {
  appliedCount: number;
  appliedFiles: string[];
}

export function getPendingMigrations(allFiles: string[], appliedFiles: string[]): string[] {
  const sqlFiles = allFiles.filter((file) => file.endsWith('.sql'));
  sqlFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const appliedSet = new Set(appliedFiles);
  return sqlFiles.filter((file) => !appliedSet.has(file));
}

export async function runMigrations(
  dbPool: pg.Pool = pool,
  migrationsDir: string = path.join(__dirname, 'migrations')
): Promise<MigrationResult> {
  const client = await dbPool.connect();
  const appliedFiles: string[] = [];

  try {
    // Create schema_migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Get applied migrations
    const { rows } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations ORDER BY id ASC;'
    );
    const existingApplied = rows.map((r) => r.filename);

    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    const allFiles = fs.readdirSync(migrationsDir);
    const pending = getPendingMigrations(allFiles, existingApplied);

    if (pending.length === 0) {
      console.info('No pending migrations to apply.');
      return { appliedCount: 0, appliedFiles: [] };
    }

    console.info(`Found ${pending.length} pending migration(s)...`);

    for (const filename of pending) {
      const filePath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.info(`Applying migration: ${filename}`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1);', [filename]);
        await client.query('COMMIT');
        appliedFiles.push(filename);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Migration failed in ${filename}:`, err);
        throw err;
      }
    }

    console.info(`✅ Successfully applied ${appliedFiles.length} migration(s).`);
    return { appliedCount: appliedFiles.length, appliedFiles };
  } finally {
    client.release();
  }
}

// CLI entry point
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('migrator.ts') || process.argv[1].endsWith('migrator.js'));

if (isDirectExecution) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration execution failed:', err);
      process.exit(1);
    });
}
