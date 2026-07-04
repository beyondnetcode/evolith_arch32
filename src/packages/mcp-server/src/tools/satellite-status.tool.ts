import { Injectable } from '@nestjs/common';
import { McpTool, McpToolSchema } from '../mcp/tool.interface';

// Local type alias mirroring @evolith/core-domain SatelliteRecord until the
// core-domain dist is rebuilt to include satellite-record exports (GT-368).
interface SatelliteRecord {
  id: string;
  name: string;
  owner: string;
  repoUrl: string;
  cloneUrl: string;
  sshUrl: string;
  topology: string;
  phase: string;
  status: string;
  mode: string;
  description?: string;
  linkedAt?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

/**
 * `evolith-satellite-status` — retrieve the current status of a single
 * satellite by its ID from the local `satellite-registry.json`.
 *
 * Implements GT-368. Returns the matching {@link SatelliteRecord} or an
 * error envelope when the satellite is not found.
 */
@Injectable()
export class SatelliteStatusTool implements McpTool {
  readonly schema: McpToolSchema = {
    name: 'evolith-satellite-status',
    description: 'Get the status and details of a registered Evolith satellite by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Full or partial satellite ID (UUID prefix match)',
        },
        path: {
          type: 'string',
          description: 'Directory containing satellite-registry.json (defaults to cwd)',
        },
      },
      required: ['id'],
    },
  };

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const id = args.id as string;
    const satellitePath = (args.path as string) || process.cwd();

    if (!id) throw new Error('id is required');

    const satellites = await readRegistry(satellitePath);

    // Support full UUID or a prefix for convenience.
    const satellite = satellites.find(
      (s) => s.id === id || String(s.id).startsWith(id),
    );

    if (!satellite) {
      return {
        tool: 'evolith-satellite-status',
        found: false,
        id,
        error: `Satellite with id '${id}' not found in registry.`,
      };
    }

    return {
      tool: 'evolith-satellite-status',
      found: true,
      satellite,
    };
  }
}

/** Read and parse satellite-registry.json; returns [] if the file is absent. */
async function readRegistry(dir: string): Promise<SatelliteRecord[]> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const registryPath = path.join(dir, 'satellite-registry.json');

  try {
    const raw = await fs.readFile(registryPath, 'utf-8');
    return JSON.parse(raw) as SatelliteRecord[];
  } catch {
    return [];
  }
}
