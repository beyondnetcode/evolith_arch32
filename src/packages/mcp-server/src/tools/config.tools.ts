import * as path from 'node:path';
import * as fs from 'fs-extra';
import * as yaml from 'yaml';
import { McpTool } from '../mcp/tool.interface';
import { sanitizePathInput } from '../utils/path-security';

/**
 * Config tools — reads/writes evolith.yaml.
 *
 * DIP NOTE: Directly imports fs-extra and yaml. Other tool files in this
 * package accept IFileSystem as a parameter. For consistency, this file
 * should be refactored to accept injected dependencies. However, since
 * config tools are simple CRUD operations on a single YAML file, the
 * practical benefit is low. Marked for future cleanup.
 *
 * TODO: Accept IFileSystem + IConfigParser as parameters for DI consistency.
 */
export function createConfigTools(): McpTool[] {
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
      execute: async (args) => handleConfigGet(args),
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
      execute: async (args) => handleConfigSet(args),
    },
  ];
}

async function handleConfigGet(args: Record<string, unknown>) {
  const dir = (args.dir as string) || process.cwd();
  const resolvedDir = path.resolve(dir);
  const configPath = path.join(resolvedDir, 'evolith.yaml');
  if (!(await fs.pathExists(configPath))) throw new Error('evolith.yaml not found');

  const config = yaml.parse(await fs.readFile(configPath, 'utf-8'));
  const key = args.key as string;
  let value: unknown = config;
  for (const k of key.split('.')) {
    value = (value as Record<string, unknown>)?.[k];
  }
  return { key, value: value ?? null };
}

async function handleConfigSet(args: Record<string, unknown>) {
  const dir = (args.dir as string) || process.cwd();
  const resolvedDir = path.resolve(dir);
  const configPath = path.join(resolvedDir, 'evolith.yaml');
  if (!(await fs.pathExists(configPath))) throw new Error('evolith.yaml not found');

  const config = yaml.parse(await fs.readFile(configPath, 'utf-8')) ?? {};
  const key = args.key as string;
  const value = args.value as string;
  const keys = key.split('.');
  let target: Record<string, unknown> = config;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!target[keys[i]]) target[keys[i]] = {};
    target = target[keys[i]] as Record<string, unknown>;
  }
  target[keys[keys.length - 1]] = value;
  await fs.writeFile(configPath, yaml.stringify(config));
  return { key, value, updated: true };
}
