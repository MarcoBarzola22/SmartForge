import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

describe('TASK-04: OpenAPI Base Specification (contract/openapi.yaml)', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const openapiPath = path.join(rootDir, 'contract', 'openapi.yaml');

  it('should have a contract/openapi.yaml file', () => {
    expect(fs.existsSync(openapiPath)).toBe(true);
  });

  it('should parse as valid OpenAPI 3.1 specification with metadata', () => {
    const rawYaml = fs.readFileSync(openapiPath, 'utf-8');
    const doc = yaml.parse(rawYaml);

    expect(doc.openapi).toMatch(/^3\.[01]\.\d+$/);
    expect(doc.info).toBeDefined();
    expect(doc.info.title).toBe('SmartForge API');
    expect(doc.info.version).toBe('1.0.0');
    expect(doc.servers).toBeInstanceOf(Array);
  });

  it('should define BearerAuth security scheme', () => {
    const rawYaml = fs.readFileSync(openapiPath, 'utf-8');
    const doc = yaml.parse(rawYaml);

    expect(doc.components?.securitySchemes).toBeDefined();
    expect(doc.components.securitySchemes.BearerAuth).toBeDefined();
    expect(doc.components.securitySchemes.BearerAuth.type).toBe('http');
    expect(doc.components.securitySchemes.BearerAuth.scheme).toBe('bearer');
    expect(doc.components.securitySchemes.BearerAuth.bearerFormat).toBe('JWT');
  });

  it('should define standard error response schemas in Spanish', () => {
    const rawYaml = fs.readFileSync(openapiPath, 'utf-8');
    const doc = yaml.parse(rawYaml);

    const schemas = doc.components?.schemas;
    expect(schemas).toBeDefined();
    expect(schemas.ErrorResponse).toBeDefined();
    expect(schemas.ErrorResponse.properties).toHaveProperty('error');
    expect(schemas.ErrorResponse.properties).toHaveProperty('code');
    expect(schemas.ValidationErrorResponse).toBeDefined();
    expect(schemas.ValidationErrorResponse.properties).toHaveProperty('details');
  });
});
