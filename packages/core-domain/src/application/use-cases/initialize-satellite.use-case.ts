import { randomUUID } from 'node:crypto';
import type { IGitHubApiClient } from '../../domain/github-api-client.interface';
import type {
  InitializeSatelliteInput,
  InitializeSatelliteOutput,
  SatelliteRecord,
} from '../../domain/satellite-record';

/**
 * Use case: Initialize or adopt a satellite repository under Evolith governance.
 *
 * In 'create' mode a new GitHub repository is provisioned.
 * In 'adopt' mode an existing repository is linked to Evolith governance
 * without creating a new remote repository.
 */
export class InitializeSatelliteUseCase {
  constructor(private readonly github: IGitHubApiClient) {}

  async execute(input: InitializeSatelliteInput): Promise<InitializeSatelliteOutput> {
    const now = new Date().toISOString();

    if (input.mode === 'adopt') {
      return this.adopt(input, now);
    }

    return this.create(input, now);
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private async adopt(
    input: InitializeSatelliteInput,
    now: string,
  ): Promise<InitializeSatelliteOutput> {
    if (!input.existingRepoUrl) {
      throw new Error('existingRepoUrl is required when mode is "adopt"');
    }

    const { owner, name } = this.parseRepoUrl(input.existingRepoUrl);

    const repo = await this.github.getRepository(owner, name);
    if (!repo) {
      throw new Error(`Repository ${owner}/${name} not found on GitHub`);
    }

    const satellite: SatelliteRecord = {
      id: randomUUID(),
      name: input.name || name,
      owner: input.owner || owner,
      repoUrl: repo.htmlUrl,
      cloneUrl: repo.cloneUrl,
      sshUrl: repo.sshUrl,
      topology: input.topology,
      phase: input.phase,
      status: 'linked',
      mode: 'adopt',
      coreVersion: input.coreVersion,
      description: input.description,
      linkedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    return this.buildOutput(satellite);
  }

  private async create(
    input: InitializeSatelliteInput,
    now: string,
  ): Promise<InitializeSatelliteOutput> {
    const repo = await this.github.createRepository({
      owner: input.owner,
      name: input.name,
      description: input.description,
      private: input.private ?? false,
      autoInit: true,
    });

    await this.github.addTopics(input.owner, input.name, [
      'evolith-satellite',
      `topology-${input.topology}`,
      `phase-${input.phase}`,
    ]);

    const satellite: SatelliteRecord = {
      id: randomUUID(),
      name: repo.name,
      owner: input.owner,
      repoUrl: repo.htmlUrl,
      cloneUrl: repo.cloneUrl,
      sshUrl: repo.sshUrl,
      topology: input.topology,
      phase: input.phase,
      status: 'provisioning',
      mode: 'create',
      coreVersion: input.coreVersion,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    };

    return this.buildOutput(satellite);
  }

  private buildOutput(satellite: SatelliteRecord): InitializeSatelliteOutput {
    const now = new Date().toISOString();
    return {
      satellite,
      outputEnvelope: {
        success: true,
        data: { satellite },
        meta: {
          requestId: randomUUID(),
          timestamp: now,
          version: '1.0.0',
        },
      },
    };
  }

  /** Parse owner and repo name from a GitHub URL such as https://github.com/owner/repo */
  private parseRepoUrl(url: string): { owner: string; name: string } {
    const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/);
    if (!match) {
      throw new Error(`Cannot parse GitHub URL: ${url}`);
    }
    return { owner: match[1], name: match[2] };
  }
}
