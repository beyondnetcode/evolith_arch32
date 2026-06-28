import type { IGitHubApiClient } from '../../domain/github-api-client.interface';
import {
  InitializeSatelliteInput,
  InitializeSatelliteOutput,
  SatelliteRecord,
} from '../../domain/satellite-record';

function generateId(): string {
  return `sat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class InitializeSatelliteUseCase {
  constructor(private readonly githubClient: IGitHubApiClient) {}

  async execute(input: InitializeSatelliteInput): Promise<InitializeSatelliteOutput> {
    if (input.mode === 'create') {
      return this.createSatellite(input);
    }
    return this.adoptSatellite(input);
  }

  private async createSatellite(input: InitializeSatelliteInput): Promise<InitializeSatelliteOutput> {
    const repo = await this.githubClient.createRepository({
      owner: input.owner,
      name: input.name,
      description: input.description,
      private: input.private ?? false,
      autoInit: true,
    });

    await this.githubClient.addTopics(input.owner, input.name, [
      'evolith-satellite',
      `topology-${input.topology}`,
      `phase-${input.phase}`,
    ]);

    const now = new Date().toISOString();
    const satellite: SatelliteRecord = {
      id: generateId(),
      name: repo.name,
      owner: input.owner,
      repoUrl: repo.htmlUrl,
      cloneUrl: repo.cloneUrl,
      sshUrl: repo.sshUrl,
      topology: input.topology,
      phase: input.phase,
      status: 'active',
      mode: 'create',
      coreVersion: input.coreVersion,
      description: input.description,
      linkedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    return this.buildOutput(satellite);
  }

  private async adoptSatellite(input: InitializeSatelliteInput): Promise<InitializeSatelliteOutput> {
    if (!input.existingRepoUrl) {
      throw new Error('existingRepoUrl is required when mode is "adopt"');
    }

    const urlParts = input.existingRepoUrl.replace(/\.git$/, '').split('/');
    const repoName = urlParts.at(-1) ?? input.name;
    const repoOwner = urlParts.at(-2) ?? input.owner;

    const repo = await this.githubClient.getRepository(repoOwner, repoName);
    if (!repo) {
      throw new Error(`Repository ${repoOwner}/${repoName} not found`);
    }

    const now = new Date().toISOString();
    const satellite: SatelliteRecord = {
      id: generateId(),
      name: repo.name,
      owner: repoOwner,
      repoUrl: repo.htmlUrl,
      cloneUrl: repo.cloneUrl,
      sshUrl: repo.sshUrl,
      topology: input.topology,
      phase: input.phase,
      status: 'linked',
      mode: 'adopt',
      coreVersion: input.coreVersion,
      description: input.description ?? repo.name,
      linkedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    return this.buildOutput(satellite);
  }

  private buildOutput(satellite: SatelliteRecord): InitializeSatelliteOutput {
    return {
      satellite,
      outputEnvelope: {
        success: true,
        data: { satellite },
        meta: {
          requestId: generateRequestId(),
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      },
    };
  }
}
