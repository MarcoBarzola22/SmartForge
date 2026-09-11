import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const openapiPath = path.join(rootDir, 'contract', 'openapi.yaml');
const backendOutDir = path.join(rootDir, 'backend', 'src', 'schemas', 'generated');
const backendOutFile = path.join(backendOutDir, 'schemas.ts');
const frontendOutDir = path.join(rootDir, 'frontend', 'src', 'api', 'generated');
const frontendOutFile = path.join(frontendOutDir, 'types.ts');

if (!fs.existsSync(openapiPath)) {
  console.error(`Error: openapi.yaml not found at ${openapiPath}`);
  process.exit(1);
}

const rawYaml = fs.readFileSync(openapiPath, 'utf-8');
const doc = yaml.parse(rawYaml);
const schemas = doc.components?.schemas || {};

function resolveZodType(propName, schema, required = false) {
  let zodExpr = '';

  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    zodExpr = `${refName}Schema`;
  } else if (schema.enum) {
    const values = schema.enum.map((v) => `'${v}'`).join(', ');
    zodExpr = `z.enum([${values}])`;
  } else if (schema.type === 'string') {
    if (schema.format === 'uuid') {
      zodExpr = 'z.string().uuid()';
    } else if (schema.format === 'email') {
      zodExpr = 'z.string().email()';
    } else if (schema.format === 'uri') {
      zodExpr = 'z.string().url()';
    } else if (schema.format === 'date' || schema.format === 'date-time') {
      zodExpr = 'z.string()';
    } else {
      zodExpr = 'z.string()';
      if (schema.minLength !== undefined) zodExpr += `.min(${schema.minLength})`;
      if (schema.maxLength !== undefined) zodExpr += `.max(${schema.maxLength})`;
    }
  } else if (schema.type === 'integer') {
    zodExpr = 'z.number().int()';
    if (schema.minimum !== undefined) zodExpr += `.min(${schema.minimum})`;
    if (schema.maximum !== undefined) zodExpr += `.max(${schema.maximum})`;
  } else if (schema.type === 'number') {
    zodExpr = 'z.number()';
    if (schema.minimum !== undefined) zodExpr += `.min(${schema.minimum})`;
    if (schema.maximum !== undefined) zodExpr += `.max(${schema.maximum})`;
  } else if (schema.type === 'boolean') {
    zodExpr = 'z.boolean()';
  } else if (schema.type === 'array') {
    const itemZod = resolveZodType('', schema.items, true);
    zodExpr = `z.array(${itemZod})`;
    if (schema.minItems !== undefined) zodExpr += `.min(${schema.minItems})`;
  } else if (schema.type === 'object') {
    if (schema.properties) {
      const props = Object.entries(schema.properties)
        .map(([pName, pSchema]) => {
          const isReq = (schema.required || []).includes(pName);
          return `  ${pName}: ${resolveZodType(pName, pSchema, isReq)}`;
        })
        .join(',\n');
      zodExpr = `z.object({\n${props}\n})`;
    } else {
      zodExpr = 'z.record(z.unknown())';
    }
  } else {
    zodExpr = 'z.unknown()';
  }

  if (!required) {
    zodExpr += '.optional()';
  }

  return zodExpr;
}

// Order schemas so dependencies come before dependents
const schemaNames = Object.keys(schemas);
const orderedSchemas = [];
const visited = new Set();

function visit(name) {
  if (visited.has(name) || !schemas[name]) return;
  visited.add(name);

  // Find refs
  const rawStr = JSON.stringify(schemas[name]);
  for (const otherName of schemaNames) {
    if (otherName !== name && rawStr.includes(`#/components/schemas/${otherName}`)) {
      visit(otherName);
    }
  }
  orderedSchemas.push(name);
}

for (const name of schemaNames) {
  visit(name);
}

// Generate Backend Schemas
let backendCode = `/**
 * AUTO-GENERATED FILE FROM contract/openapi.yaml. DO NOT EDIT DIRECTLY.
 * Source of truth: Constitution §1, RNF-07.
 */
import { z } from 'zod';

`;

for (const name of orderedSchemas) {
  const schema = schemas[name];
  const zodDef = resolveZodType(name, schema, true);
  backendCode += `export const ${name}Schema = ${zodDef};\n`;
  backendCode += `export type ${name} = z.infer<typeof ${name}Schema>;\n\n`;
}

// Ensure output dirs exist
fs.mkdirSync(backendOutDir, { recursive: true });
fs.writeFileSync(backendOutFile, backendCode, 'utf-8');

// Generate Frontend Types
let frontendCode = `/**
 * AUTO-GENERATED FILE FROM contract/openapi.yaml. DO NOT EDIT DIRECTLY.
 * Source of truth: Constitution §1, RNF-07.
 */
`;

for (const name of orderedSchemas) {
  const schema = schemas[name];
  if (schema.enum) {
    const enumTypes = schema.enum.map((v) => `'${v}'`).join(' | ');
    frontendCode += `export type ${name} = ${enumTypes};\n\n`;
  } else if (schema.properties) {
    frontendCode += `export type ${name} = {\n`;
    for (const [pName, pSchema] of Object.entries(schema.properties)) {
      const isReq = (schema.required || []).includes(pName);
      let tsType = 'unknown';
      if (pSchema.$ref) {
        tsType = pSchema.$ref.split('/').pop();
      } else if (pSchema.enum) {
        tsType = pSchema.enum.map((v) => `'${v}'`).join(' | ');
      } else if (pSchema.type === 'string') {
        tsType = 'string';
      } else if (pSchema.type === 'integer' || pSchema.type === 'number') {
        tsType = 'number';
      } else if (pSchema.type === 'boolean') {
        tsType = 'boolean';
      } else if (pSchema.type === 'array') {
        const itemType = pSchema.items?.$ref
          ? pSchema.items.$ref.split('/').pop()
          : pSchema.items?.type === 'string'
            ? 'string'
            : 'unknown';
        tsType = `${itemType}[]`;
      } else if (pSchema.type === 'object') {
        tsType = 'Record<string, unknown>';
      }
      frontendCode += `  ${pName}${isReq ? '' : '?'}: ${tsType};\n`;
    }
    frontendCode += `};\n\n`;
  } else {
    frontendCode += `export type ${name} = Record<string, unknown>;\n\n`;
  }
}

fs.mkdirSync(frontendOutDir, { recursive: true });
fs.writeFileSync(frontendOutFile, frontendCode, 'utf-8');

console.info('✅ Generated Zod schemas and TypeScript types successfully.');
