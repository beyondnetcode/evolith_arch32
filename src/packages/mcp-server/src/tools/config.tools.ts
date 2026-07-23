import * as path from 'node:path';
import * as fs from 'fs-extra';
import * as yaml from 'yaml';
import { McpTool } from '../mcp/tool.interface';
import { sanitizePathInput } from '../utils/path-security';

/** Read/write tools over a repository's `evolith.yaml`. */
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
  const configPath = path.join(sanitizePathInput(dir, process.cwd()), 'evolith.yaml');
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
  const configPath = path.join(sanitizePathInput(dir, process.cwd()), 'evolith.yaml');
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
