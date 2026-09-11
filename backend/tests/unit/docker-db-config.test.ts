import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('TASK-02: Docker PostgreSQL Configuration', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const dockerComposePath = path.join(rootDir, 'docker-compose.yml');
  const envExamplePath = path.join(rootDir, '.env.example');

  it('should have a docker-compose.yml file', () => {
    expect(fs.existsSync(dockerComposePath)).toBe(true);
  });

  it('should configure postgres service with postgres:16-alpine and healthcheck', () => {
    const content = fs.readFileSync(dockerComposePath, 'utf-8');
    expect(content).toContain('services:');
    expect(content).toContain('db:');
    expect(content).toMatch(/image:\s*postgres:16/);
    expect(content).toContain('5432');
    expect(content).toContain('healthcheck:');
    expect(content).toContain('pg_isready');
    expect(content).toContain('smartforge');
  });

  it('should have a .env.example with database configuration', () => {
    expect(fs.existsSync(envExamplePath)).toBe(true);
    const envContent = fs.readFileSync(envExamplePath, 'utf-8');
    expect(envContent).toContain('POSTGRES_DB');
    expect(envContent).toContain('POSTGRES_USER');
    expect(envContent).toContain('POSTGRES_PASSWORD');
    expect(envContent).toContain('POSTGRES_PORT');
    expect(envContent).toContain('DATABASE_URL');
  });
});
