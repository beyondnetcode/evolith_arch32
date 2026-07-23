import { sanitizePathInput } from './path-security';

describe('sanitizePathInput', () => {
  const baseDir = '/workspace/project';

  it('accepts valid relative paths', () => {
    expect(sanitizePathInput('src/index.ts', baseDir)).toBe('/workspace/project/src/index.ts');
  });

  it('accepts nested paths', () => {
    expect(sanitizePathInput('src/components/Button.tsx', baseDir)).toBe('/workspace/project/src/components/Button.tsx');
  });

  it('rejects path traversal with ..', () => {
    expect(() => sanitizePathInput('../etc/passwd', baseDir)).toThrow('Path traversal detected');
  });

  it('rejects absolute paths', () => {
    expect(() => sanitizePathInput('/etc/passwd', baseDir)).toThrow('Path traversal detected');
  });

  it('rejects paths with unsafe characters', () => {
    expect(() => sanitizePathInput('src/file; rm -rf /', baseDir)).toThrow('Invalid path characters');
  });

  it('rejects paths with spaces', () => {
    expect(() => sanitizePathInput('src/my file.ts', baseDir)).toThrow('Invalid path characters');
  });

  it('rejects paths that escape base directory', () => {
    expect(() => sanitizePathInput('src/../../etc/passwd', baseDir)).toThrow();
  });

  it('accepts paths with dots in filenames', () => {
    expect(sanitizePathInput('src/index.ts', baseDir)).toBe('/workspace/project/src/index.ts');
    expect(sanitizePathInput('src/Component.test.tsx', baseDir)).toBe('/workspace/project/src/Component.test.tsx');
  });

  it('accepts paths with hyphens', () => {
    expect(sanitizePathInput('src/my-component.ts', baseDir)).toBe('/workspace/project/src/my-component.ts');
  });

  it('accepts paths with underscores', () => {
    expect(sanitizePathInput('src/my_component.ts', baseDir)).toBe('/workspace/project/src/my_component.ts');
  });
});
