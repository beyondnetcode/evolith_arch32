import * as path from 'node:path';

/**
 * Shared path traversal prevention (H4 / CWE-22).
 *
 * Validates that a user-supplied path component stays within the base
 * directory and contains only safe characters. Used by all MCP tools
 * that accept filesystem path arguments.
 *
 * @throws {Error} if the path contains traversal sequences, absolute
 * paths outside the base, or forbidden characters.
 */
const SAFE_NAME_REGEX = /^[a-zA-Z0-9_\-\/\.]+$/;

export function sanitizePathInput(input: string, baseDir: string): string {
  if (input.includes('..') || path.isAbsolute(input)) {
    throw new Error('Path traversal detected');
  }
  if (!SAFE_NAME_REGEX.test(input)) {
    throw new Error('Invalid path characters');
  }
  const resolved = path.resolve(baseDir, input);
  if (!resolved.startsWith(baseDir)) {
    throw new Error('Path escapes base directory');
  }
  return resolved;
}
