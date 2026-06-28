import { Injectable } from '@nestjs/common';
import { IGitHubApiClient } from '../../domain/github-api-client.interface';
import { ILogger } from '../../domain/interfaces';
import {
  InitializeSatelliteInput,
  InitializeSatelliteOutput,
  SatelliteRecord,
} from '../../domain/satellite-record';

/**
 * GT-364 — InitializeSatelliteUseCase
 *
 * Orchestrates creating a new GitHub satellite repository (mode='create') or
 * adopting an existing one (mode='adopt'), then persists a SatelliteRecord.
 *
 * Responsibility boundary:
 *  - In 'create' mode: delegates repo creation to IGitHubApiClient, tags it
 *    with the 'evolith-satellite' topic, and returns the new SatelliteRecord.
 *  - In 'adopt' mode: verifies the repository exists via IGitHubApiClient and
 *    constructs the SatelliteRecord from the remote metadata.
 *
 * The use case does NOT persist to any database; callers should pass the
 * returned SatelliteRecord to a repository port of their choice.
 */
@Injectable()
export class InitializeSatelliteUseCase {
  constructor(
    private readonly githubClient?: IGitHubApiClient,
    private readonly logger?: ILogger,
  ) {}

  async execute(input: InitializeSatelliteInput): Promise<InitializeSatelliteOutput> {
    if (!this.githubClient) {
      throw new Error('GitHub client not configured — provide a token');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    this.logger?.info(`[InitializeSatelliteUseCase] mode=${input.mode} name=${input.name}`, { id });

    let satellite: SatelliteRecord;

    if (input.mode === 'create') {
      satellite = await this.handleCreate(id, now, input);
    } else {
      satellite = await this.handleAdopt(id, now, input);
    }

    return {
      satellite,
      outputEnvelope: {
        success: true,
        data: { satellite },
        meta: {
          requestId: id,
          timestamp: now,
          version: '1',
        },
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async handleCreate(
    id: string,
    now: string,
    input: InitializeSatelliteInput,
  ): Promise<SatelliteRecord> {
    const repo = await this.githubClient!.createRepository({
      owner: input.owner,
      name: input.name,
      description: input.description,
      private: input.private ?? false,
      autoInit: true,
    });

    await this.githubClient!.addTopics(input.owner, input.name, ['evolith-satellite']);

    this.logger?.info(
      `[InitializeSatelliteUseCase] created repo ${repo.fullName}`,
      { id, htmlUrl: repo.htmlUrl },
    );

    return this.buildRecord(id, now, input, repo.htmlUrl, repo.cloneUrl, repo.sshUrl, 'provisioning');
  }

  private async handleAdopt(
    id: string,
    now: string,
    input: InitializeSatelliteInput,
  ): Promise<SatelliteRecord> {
    const repo = await this.githubClient!.getRepository(input.owner, input.name);

    if (!repo) {
      throw new Error(
        `Repository ${input.owner}/${input.name} not found — cannot adopt a non-existent repo`,
      );
    }

    this.logger?.info(
      `[InitializeSatelliteUseCase] adopted repo ${repo.fullName}`,
      { id, htmlUrl: repo.htmlUrl },
    );

    return this.buildRecord(id, now, input, repo.htmlUrl, repo.cloneUrl, repo.sshUrl, 'linked');
  }

  private buildRecord(
    id: string,
    now: string,
    input: InitializeSatelliteInput,
    repoUrl: string,
    cloneUrl: string,
    sshUrl: string,
    status: SatelliteRecord['status'],
  ): SatelliteRecord {
    return {
      id,
      name: input.name,
      owner: input.owner,
      repoUrl,
      cloneUrl,
      sshUrl,
      topology: input.topology,
      phase: input.phase,
      status,
      mode: input.mode,
      coreVersion: input.coreVersion,
      description: input.description,
      linkedAt: status === 'linked' ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };
  }
}
