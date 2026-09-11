import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('TASK-03: Tooling Configuration (ESLint, Prettier, Vitest)', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const packageJsonPath = path.join(rootDir, 'package.json');
  const prettierrcPath = path.join(rootDir, '.prettierrc');
  const eslintConfigPath = path.join(rootDir, 'eslint.config.js');

  it('should have a root .prettierrc file with formatting rules', () => {
    expect(fs.existsSync(prettierrcPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(prettierrcPath, 'utf-8'));
    expect(content.singleQuote).toBe(true);
    expect(content.semi).toBe(true);
  });

  it('should have a root eslint.config.js file with typescript support', () => {
    expect(fs.existsSync(eslintConfigPath)).toBe(true);
    const content = fs.readFileSync(eslintConfigPath, 'utf-8');
    expect(content).toContain('export default');
  });

  it('should define lint and format scripts in root package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    expect(pkg.scripts).toHaveProperty('lint');
    expect(pkg.scripts).toHaveProperty('format');
    expect(pkg.scripts).toHaveProperty('test');
  });
});
