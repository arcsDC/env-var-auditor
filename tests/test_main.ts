import { parseEnvFile, auditEnv } from '../src/index';

describe('parseEnvFile', () => {
  it('parses basic key-value pairs', () => {
    const content = 'KEY1=value1\nKEY2=value2';
    const result = parseEnvFile(content);
    expect(result.get('KEY1')).toBe('value1');
    expect(result.get('KEY2')).toBe('value2');
  });

  it('ignores comments and empty lines', () => {
    const content = '# comment\n\nKEY=value';
    const result = parseEnvFile(content);
    expect(result.size).toBe(1);
    expect(result.get('KEY')).toBe('value');
  });

  it('strips quotes from values', () => {
    const content = 'KEY="quoted value"';
    const result = parseEnvFile(content);
    expect(result.get('KEY')).toBe('quoted value');
  });
});

describe('auditEnv', () => {
  it('detects missing required variables', () => {
    const envVars = new Map([['OPTIONAL', 'val']]);
    const schema = { required: ['REQUIRED_VAR'], optional: ['OPTIONAL'] };
    const result = auditEnv(envVars, schema);
    expect(result.missing).toContain('REQUIRED_VAR');
    expect(result.valid).toBe(false);
  });

  it('detects unused variables', () => {
    const envVars = new Map([['UNKNOWN', 'val']]);
    const schema = { required: [], optional: [] };
    const result = auditEnv(envVars, schema);
    expect(result.unused).toContain('UNKNOWN');
  });

  it('returns valid if all required vars present', () => {
    const envVars = new Map([['REQ', 'val']]);
    const schema = { required: ['REQ'], optional: [] };
    const result = auditEnv(envVars, schema);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });
});
