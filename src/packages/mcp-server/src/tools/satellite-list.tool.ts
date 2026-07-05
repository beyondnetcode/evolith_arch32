import { Injectable } from '@nestjs/common';
import { McpTool, McpToolSchema } from '../mcp/tool.interface';

// Local type alias mirroring @beyondnet/evolith-core-domain SatelliteRecord until the
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
 * `evolith-satellite-list` — list all satellites registered in the local
 * `satellite-registry.json`.
 *
 * Implements GT-368. Returns an empty array when no registry file is found.
 * Supports `json` (default) and `table` output formats.
 */
@Injectable()
export class SatelliteListTool implements McpTool {
  readonly schema: McpToolSchema = {
    name: 'evolith-satellite-list',
    description: 'List all registered Evolith satellites from the local satellite-registry.json.',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          description: 'Output format: json (default) or table',
          default: 'json',
        },
        path: {
          type: 'string',
          description: 'Directory containing satellite-registry.json (defaults to cwd)',
        },
      },
    },
  };

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const format = (args.format as string) || 'json';
    const satellitePath = (args.path as string) || process.cwd();

    const satellites = await readRegistry(satellitePath);

    if (format === 'table') {
      return formatTable(satellites);
    }

    return {
      tool: 'evolith-satellite-list',
      count: satellites.length,
      satellites,
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

function formatTable(satellites: SatelliteRecord[]): string {
  if (satellites.length === 0) {
    return 'No satellites registered.';
  }

  const lines = [
    '| ID | Name | Owner | Topology | Phase | Status | Mode |',
    '|----|------|-------|----------|-------|--------|------|',
  ];

  for (const s of satellites) {
    lines.push(
      `| ${String(s.id).slice(0, 8)} | ${s.name} | ${s.owner} | ${s.topology} | ${s.phase} | ${s.status} | ${s.mode} |`,
    );
  }

  return lines.join('\n');
}
