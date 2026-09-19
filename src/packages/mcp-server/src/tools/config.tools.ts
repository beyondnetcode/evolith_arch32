import * as path from 'node:path';
import * as fs from 'fs-extra';
import * as yaml from 'yaml';
import { McpTool } from '../mcp/tool.interface';
import { sanitizePathInput } from '../utils/path-security';

/**
 * Segments that would walk the key path onto `Object.prototype` instead of into
 * the document (CWE-1321). `evolith.yaml` never legitimately holds them.
 */
const FORBIDDEN_KEY_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

/** Split a dot-path into segments, refusing empties and prototype walkers. */
function keySegments(key: string): string[] {
  const segments = key.split('.');
  for (const segment of segments) {
    if (segment.length === 0) throw new Error(`Invalid key "${key}": empty segment`);
    if (FORBIDDEN_KEY_SEGMENTS.has(segment)) {
      throw new Error(`Invalid key "${key}": "${segment}" is not an allowed segment`);
    }
  }
  return segments;
}

/**
 * Config Tool Service — reads/writes evolith.yaml.
 * Converted from procedural module to class for testability (SRP).
 */
export class ConfigToolService {
  /**
   * Read a nested key from evolith.yaml.
   * @param dir Directory containing evolith.yaml
   * @param key Dot-separated key path (e.g., 'product.phase')
   */
  async getConfig(dir: string, key: string): Promise<{ key: string; value: unknown }> {
    const resolvedDir = path.resolve(dir);
    const configPath = path.join(resolvedDir, 'evolith.yaml');
    if (!(await fs.pathExists(configPath))) throw new Error('evolith.yaml not found');

    const config = yaml.parse(await fs.readFile(configPath, 'utf-8'));
    let value: unknown = config;
    for (const k of keySegments(key)) {
      value = (value as Record<string, unknown>)?.[k];
    }
    return { key, value: value ?? null };
  }

  /**
   * Set a nested key in evolith.yaml.
   * @param dir Directory containing evolith.yaml
   * @param key Dot-separated key path
   * @param value Value to set (always stored as string)
   */
  async setConfig(dir: string, key: string, value: string): Promise<{ key: string; value: string; updated: boolean }> {
    const resolvedDir = path.resolve(dir);
    const configPath = path.join(resolvedDir, 'evolith.yaml');
    if (!(await fs.pathExists(configPath))) throw new Error('evolith.yaml not found');

    const config = yaml.parse(await fs.readFile(configPath, 'utf-8')) ?? {};
    const keys = keySegments(key);
    let target: Record<string, unknown> = config;
    for (let i = 0; i < keys.length - 1; i++) {
      // Only descend into an OWN plain object; a scalar or an inherited property
      // is replaced, never written through.
      const next = Object.prototype.hasOwnProperty.call(target, keys[i]) ? target[keys[i]] : undefined;
      if (typeof next !== 'object' || next === null || Array.isArray(next)) target[keys[i]] = {};
      target = target[keys[i]] as Record<string, unknown>;
    }
    target[keys[keys.length - 1]] = value;
    await fs.writeFile(configPath, yaml.stringify(config));
    return { key, value, updated: true };
  }
}

/** Create MCP tool definitions backed by ConfigToolService. */
export function createConfigTools(): McpTool[] {
  const service = new ConfigToolService();
  return [
    {
      schema: {
        name: 'evolith-config-get',
        description: 'Get Evolith configuration value',
        inputSchema: {
          type: 'object',
          properties: { key: { type: 'string' }, dir: { type: 'string' } },
          required: ['key'],
        },
      },
      execute: async (args) => {
        const dir = (args.dir as string) || process.cwd();
        return service.getConfig(dir, args.key as string);
      },
    },
    {
      schema: {
        name: 'evolith-config-set',
        description: 'Set Evolith configuration value',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            value: { type: 'string' },
            dir: { type: 'string' },
            confirm: { type: 'boolean', description: 'Confirm mutative operation' },
          },
          required: ['key', 'value'],
        },
      },
      mutative: true,
      execute: async (args) => {
        const dir = (args.dir as string) || process.cwd();
        return service.setConfig(dir, args.key as string, args.value as string);
      },
    },
  ];
}
