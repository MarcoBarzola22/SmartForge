import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import yaml from 'yaml';

describe('TASK-77: GitHub Actions CI Pipeline Configuration (Constitución §4, RNF-08)', () => {
  const rootDir = resolve(__dirname, '../../../');
  const ciWorkflowPath = resolve(rootDir, '.github/workflows/ci.yml');

  it('should have a valid .github/workflows/ci.yml workflow file', () => {
    expect(existsSync(ciWorkflowPath)).toBe(true);
    const fileContent = readFileSync(ciWorkflowPath, 'utf-8');
    const parsed = yaml.parse(fileContent);

    expect(parsed).toBeDefined();
    expect(parsed.name).toBeDefined();
    expect(parsed.on).toBeDefined();
    expect(parsed.jobs).toBeDefined();
  });

  it('should trigger on push and pull_request to main/master branches', () => {
    const fileContent = readFileSync(ciWorkflowPath, 'utf-8');
    const parsed = yaml.parse(fileContent);

    const onConfig = parsed.on;
    expect(onConfig.push || onConfig.pull_request).toBeDefined();

    if (onConfig.push) {
      const branches = onConfig.push.branches || onConfig.push;
      expect(branches).toEqual(expect.arrayContaining([expect.stringMatching(/main|master/)]));
    }
    if (onConfig.pull_request) {
      const branches = onConfig.pull_request.branches || onConfig.pull_request;
      expect(branches).toEqual(expect.arrayContaining([expect.stringMatching(/main|master/)]));
    }
  });

  it('should include sequential verification pipeline conforming to Constitución §4', () => {
    const fileContent = readFileSync(ciWorkflowPath, 'utf-8');
    const parsed = yaml.parse(fileContent);

    const jobs = parsed.jobs;
    expect(jobs).toBeDefined();

    // Collect all step names or command runs across jobs
    const allRuns: string[] = [];
    Object.values(jobs).forEach((job: any) => {
      if (Array.isArray(job.steps)) {
        job.steps.forEach((step: any) => {
          if (step.run) allRuns.push(step.run);
          if (step.name) allRuns.push(step.name);
        });
      }
    });

    const combinedRuns = allRuns.join(' \n ');

    // Must check openapi lint
    expect(combinedRuns).toMatch(/lint:openapi|redocly/i);
    // Must generate types
    expect(combinedRuns).toMatch(/generate:types|generate-types/i);
    // Must check types (tsc / typecheck)
    expect(combinedRuns).toMatch(/typecheck|tsc/i);
    // Must run unit tests
    expect(combinedRuns).toMatch(/test:unit|npm run test/i);
    // Must run contract tests
    expect(combinedRuns).toMatch(/test:contract/i);
  });

  it('should configure PostgreSQL service container for contract tests', () => {
    const fileContent = readFileSync(ciWorkflowPath, 'utf-8');
    const parsed = yaml.parse(fileContent);

    const hasPostgres = JSON.stringify(parsed).includes('postgres');
    expect(hasPostgres).toBe(true);
  });
});
