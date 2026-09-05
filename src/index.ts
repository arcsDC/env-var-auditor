import * as fs from 'fs';
import * as path from 'path';

interface EnvSchema {
  required: string[];
  optional: string[];
}

interface AuditResult {
  missing: string[];
  unused: string[];
  duplicates: string[];
  valid: boolean;
}

export function parseEnvFile(content: string): Map<string, string> {
  const vars = new Map<string, string>();
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars.set(key, value);
  }
  return vars;
}

export function auditEnv(envVars: Map<string, string>, schema: EnvSchema): AuditResult {
  const missing: string[] = [];
  const unused: string[] = [];
  const duplicates: string[] = [];
  
  const allSchemaVars = new Set([...schema.required, ...schema.optional]);
  
  for (const req of schema.required) {
    if (!envVars.has(req)) {
      missing.push(req);
    }
  }
  
  for (const key of envVars.keys()) {
    if (!allSchemaVars.has(key)) {
      unused.push(key);
    }
  }
  
  const seen = new Set<string>();
  for (const key of envVars.keys()) {
    if (seen.has(key)) {
      duplicates.push(key);
    }
    seen.add(key);
  }
  
  return {
    missing,
    unused,
    duplicates,
    valid: missing.length === 0 && duplicates.length === 0
  };
}

export function runAudit(envFilePath: string, schemaPath: string): AuditResult {
  const envContent = fs.readFileSync(envFilePath, 'utf-8');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const schema: EnvSchema = JSON.parse(schemaContent);
  const envVars = parseEnvFile(envContent);
  return auditEnv(envVars, schema);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: ts-node src/index.ts <env-file> <schema-file>');
    process.exit(1);
  }
  
  const [envFile, schemaFile] = args;
  
  if (!fs.existsSync(envFile)) {
    console.error(`Error: Environment file not found: ${envFile}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(schemaFile)) {
    console.error(`Error: Schema file not found: ${schemaFile}`);
    process.exit(1);
  }
  
  const result = runAudit(envFile, schemaFile);
  
  console.log('=== Environment Variable Audit ===');
  
  if (result.missing.length > 0) {
    console.log('\n❌ Missing required variables:');
    result.missing.forEach(v => console.log(`   - ${v}`));
  }
  
  if (result.unused.length > 0) {
    console.log('\n⚠️  Unused variables (not in schema):');
    result.unused.forEach(v => console.log(`   - ${v}`));
  }
  
  if (result.duplicates.length > 0) {
    console.log('\n❌ Duplicate variables:');
    result.duplicates.forEach(v =>
