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
 * `evolith-satellite-create` — provision a new satellite repository on GitHub
 * and register it in the local satellite registry.
 *
 * Implements GT-368. Returns an ADR-0073 output envelope with the newly
 * created {@link SatelliteRecord}.
 *
 * Uses native Node.js `fetch` (Node 18+) to call the GitHub REST API v3
 * directly, avoiding the dependency on the not-yet-published
 * `GitHubApiAdapter` from `@beyondnet/evolith-infra-providers`.
 */
@Injectable()
export class SatelliteCreateTool implements McpTool {
  readonly schema: McpToolSchema = {
    name: 'evolith-satellite-create',
    description: 'Create a new satellite repository on GitHub and register it with Evolith. Returns an ADR-0073 output envelope.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Local path where the satellite registry lives (defaults to cwd)',
        },
        token: {
          type: 'string',
          description: 'GitHub personal access token with repo scope',
        },
        name: {
          type: 'string',
          description: 'Repository name for the new satellite',
        },
        owner: {
          type: 'string',
          description: 'GitHub user or organization that will own the repository',
        },
        topology: {
          type: 'string',
          description: 'Evolith topology (monolith | modular | micro | distributed | custom)',
          default: 'modular',
        },
        phase: {
          type: 'string',
          description: 'SDLC phase (discovery | design | construction | qa | release)',
          default: 'discovery',
        },
        description: {
          type: 'string',
          description: 'Optional repository description',
        },
        private: {
          type: 'boolean',
          description: 'Whether the new repository should be private (default false)',
          default: false,
        },
      },
      required: ['token', 'name', 'owner'],
    },
  };

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const token = args.token as string;
    const name = args.name as string;
    const owner = args.owner as string;
    const topology = ((args.topology as string) || 'modular') as SatelliteTopology;
    const phase = (args.phase as string) || 'discovery';
    const description = args.description as string | undefined;
    const isPrivate = Boolean(args.private);
    const satellitePath = (args.path as string) || process.cwd();

    if (!token) throw new Error('token is required');
    if (!name) throw new Error('name is required');
    if (!owner) throw new Error('owner is required');

    const repo = await createGitHubRepository(token, owner, name, {
      description,
      private: isPrivate,
    });

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
      status: 'provisioning',
      mode: 'create',
      description,
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

async function createGitHubRepository(
  token: string,
  owner: string,
  name: string,
  opts: { description?: string; private?: boolean },
): Promise<GitHubRepoResponse> {
  // Use /orgs/:owner/repos when owner is provided (may be user or org).
  // GitHub will reject with 422 if the token holder is not that user; callers
  // are responsible for supplying the correct owner.
  const url = `https://api.github.com/orgs/${owner}/repos`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description: opts.description,
      private: opts.private ?? false,
      auto_init: true,
    }),
  });

  if (!response.ok) {
    // Fallback to /user/repos for personal accounts
    if (response.status === 404 || response.status === 422) {
      const userResp = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: opts.description,
          private: opts.private ?? false,
          auto_init: true,
        }),
      });
      if (!userResp.ok) {
        throw new Error(`GitHub API error ${userResp.status}: POST /user/repos`);
      }
      return userResp.json() as Promise<GitHubRepoResponse>;
    }
    throw new Error(`GitHub API error ${response.status}: POST /orgs/${owner}/repos`);
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
