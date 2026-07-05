import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { McpTool, McpToolSchema } from '../mcp/tool.interface';

// Local type aliases mirroring @beyondnet/evolith-core-domain SatelliteRecord until the
// core-domain dist is rebuilt to include satellite-record exports (GT-368).
type SatelliteStatus = 'provisioning' | 'active' | 'linked' | 'error' | 'archived';
type SatelliteMode = 'create' | 'adopt';
type SatelliteTopology = 'monolith' | 'modular' | 'micro' | 'distributed' | 'custom';

interface SatelliteRecord {
  id: string;
  name: string;
  owner: string;
  repoUrl: string;
  cloneUrl: string;
  sshUrl: string;
  topology: SatelliteTopology | string;
  phase: string;
  status: SatelliteStatus;
  mode: SatelliteMode;
  coreVersion?: string;
  parentCorePath?: string;
  description?: string;
  linkedAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  clone_url: string;
  ssh_url: string;
  html_url: string;
  private: boolean;
  default_branch: string;
}

/**
 * `evolith-satellite-adopt` — adopt an existing GitHub repository as an
 * Evolith satellite and register it in the local satellite registry.
 *
 * Implements GT-368. Parses the owner/name from the provided `repoUrl`,
 * verifies the repository exists, then persists a {@link SatelliteRecord}
 * with `mode='adopt'`. Returns an ADR-0073 output envelope.
 *
 * Uses native Node.js `fetch` (Node 18+) to call the GitHub REST API v3
 * directly, avoiding the dependency on the not-yet-published
 * `GitHubApiAdapter` from `@beyondnet/evolith-infra-providers`.
 */
@Injectable()
export class SatelliteAdoptTool implements McpTool {
  readonly schema: McpToolSchema = {
    name: 'evolith-satellite-adopt',
    description: 'Adopt an existing GitHub repository as an Evolith satellite. Returns an ADR-0073 output envelope.',
    inputSchema: {
      type: 'object',
      properties: {
        repoUrl: {
          type: 'string',
          description: 'Full GitHub URL of the repository to adopt (e.g. https://github.com/owner/repo)',
        },
        token: {
          type: 'string',
          description: 'GitHub personal access token with repo scope',
        },
        topology: {
          type: 'string',
          description: 'Evolith topology to assign (monolith | modular | micro | distributed | custom)',
          default: 'modular',
        },
        phase: {
          type: 'string',
          description: 'SDLC phase to assign (discovery | design | construction | qa | release)',
          default: 'discovery',
        },
        owner: {
          type: 'string',
          description: 'Override the owner extracted from repoUrl (optional)',
        },
        path: {
          type: 'string',
          description: 'Local path where the satellite registry lives (defaults to cwd)',
        },
      },
      required: ['repoUrl', 'token'],
    },
  };

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const repoUrl = args.repoUrl as string;
    const token = args.token as string;
    const topology = ((args.topology as string) || 'modular') as SatelliteTopology;
    const phase = (args.phase as string) || 'discovery';
    const satellitePath = (args.path as string) || process.cwd();

    if (!repoUrl) throw new Error('repoUrl is required');
    if (!token) throw new Error('token is required');

    const { owner: parsedOwner, name } = parseRepoUrl(repoUrl);
    const resolvedOwner = (args.owner as string) || parsedOwner;

    const repo = await getGitHubRepository(token, resolvedOwner, name);

    if (!repo) {
      throw new Error(`Repository not found: ${resolvedOwner}/${name}`);
    }

    const now = new Date().toISOString();
    const satellite: SatelliteRecord = {
      id: randomUUID(),
      name: repo.name,
      owner: repo.full_name.split('/')[0],
      repoUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url,
      topology,
      phase,
      status: 'linked' as SatelliteStatus,
      mode: 'adopt' as SatelliteMode,
      linkedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await persistSatelliteRecord(satellite, satellitePath);

    return {
      success: true,
      data: { satellite },
      meta: {
        requestId: randomUUID(),
        timestamp: now,
        version: '1.0.0',
      },
    };
  }
}

/** Extract owner and repo name from a GitHub URL. */
function parseRepoUrl(repoUrl: string): { owner: string; name: string } {
  // Supports https://github.com/owner/repo and git@github.com:owner/repo.git
  const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(\.git)?$/);
  if (!match) {
    throw new Error(`Cannot parse GitHub repository URL: ${repoUrl}`);
  }
  return { owner: match[1], name: match[2] };
}

async function getGitHubRepository(
  token: string,
  owner: string,
  repo: string,
): Promise<GitHubRepoResponse | null> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}: GET /repos/${owner}/${repo}`);
  }

  return response.json() as Promise<GitHubRepoResponse>;
}

/** Append a satellite record to satellite-registry.json in the given directory. */
async function persistSatelliteRecord(satellite: SatelliteRecord, dir: string): Promise<void> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const registryPath = path.join(dir, 'satellite-registry.json');

  let registry: SatelliteRecord[] = [];
  try {
    const raw = await fs.readFile(registryPath, 'utf-8');
    registry = JSON.parse(raw) as SatelliteRecord[];
  } catch {
    // File does not exist yet — start with an empty list.
  }

  registry.push(satellite);
  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
}
