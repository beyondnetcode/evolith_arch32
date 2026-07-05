import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { InitializeSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases/initialize-satellite.use-case';
import { GitHubApiAdapter } from '@beyondnet/evolith-infra-providers';
import type { SatelliteTopology } from '@beyondnet/evolith-core-domain/domain/satellite-record';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';

interface SatelliteAdoptCommandOptions {
  repo?: string;
  topology?: string;
  phase?: string;
  token?: string;
  owner?: string;
}

/**
 * `evolith satellite:adopt` — adopts an existing GitHub repository into
 * Evolith governance without creating a new remote repository.
 */
@Command({
  name: 'satellite:adopt',
  description: 'Adopt an existing GitHub repository as an Evolith satellite',
})
export class SatelliteAdoptCommand extends BaseEvolithCommand {
  constructor(
    promptService: PromptService,
    configService?: ConfigService,
  ) {
    super('SatelliteAdoptCommand', promptService, configService);
  }

  async executeCommand(
    _passedParam: string[],
    options?: SatelliteAdoptCommandOptions,
  ): Promise<void> {
    this.promptService.showIntro('Evolith — Adopt Satellite Repository');

    // -------------------------------------------------------------------------
    // 1. Resolve repo URL
    // -------------------------------------------------------------------------
    let repoUrl = options?.repo ?? '';
    if (!repoUrl) {
      repoUrl = await this.promptService.text({
        message: 'GitHub repository URL (https://github.com/owner/repo)',
        placeholder: 'https://github.com/myorg/myrepo',
        validate: (v) => {
          if (!v.startsWith('https://github.com/')) {
            return 'URL must start with https://github.com/';
          }
          if (!/github\.com\/[^/]+\/[^/]+/.test(v)) {
            return 'URL must be in the form https://github.com/owner/repo';
          }
          return undefined;
        },
      });
    }

    // -------------------------------------------------------------------------
    // 2. Parse owner / name from the URL
    // -------------------------------------------------------------------------
    const parsed = this.parseRepoUrl(repoUrl);

    // -------------------------------------------------------------------------
    // 3. Resolve owner (explicit flag overrides parsed value)
    // -------------------------------------------------------------------------
    let owner = options?.owner ?? parsed.owner;
    if (!owner) {
      owner = await this.promptService.text({
        message: 'GitHub owner (user or organization)',
        placeholder: parsed.owner || 'myorg',
      });
    }

    // -------------------------------------------------------------------------
    // 4. Resolve topology
    // -------------------------------------------------------------------------
    const topologyChoices: { value: SatelliteTopology; label: string }[] = [
      { value: 'monolith', label: 'Monolith' },
      { value: 'modular', label: 'Modular monolith' },
      { value: 'micro', label: 'Microservices' },
      { value: 'distributed', label: 'Distributed' },
      { value: 'custom', label: 'Custom' },
    ];

    const topology: SatelliteTopology = options?.topology
      ? (options.topology as SatelliteTopology)
      : await this.promptService.select<SatelliteTopology>({
          message: 'Architecture topology',
          options: topologyChoices,
          initialValue: 'monolith',
        });

    // -------------------------------------------------------------------------
    // 5. Resolve phase
    // -------------------------------------------------------------------------
    let phase = options?.phase ?? '';
    if (!phase) {
      phase = await this.promptService.select<string>({
        message: 'SDLC phase',
        options: [
          { value: 'alpha', label: 'Alpha' },
          { value: 'beta', label: 'Beta' },
          { value: 'rc', label: 'Release Candidate (RC)' },
          { value: 'ga', label: 'General Availability (GA)' },
        ],
        initialValue: 'alpha',
      });
    }

    // -------------------------------------------------------------------------
    // 6. Resolve GitHub token
    // -------------------------------------------------------------------------
    const token = options?.token ?? process.env['GITHUB_TOKEN'] ?? '';
    if (!token) {
      this.promptService.showWarning(
        'No GitHub token found. Set --token or GITHUB_TOKEN env var. ' +
          'The adopt operation will likely fail without a valid token.',
      );
    }

    // -------------------------------------------------------------------------
    // 7. Execute use case
    // -------------------------------------------------------------------------
    this.promptService.startSpinner(`Adopting ${repoUrl} into Evolith governance...`);

    try {
      const useCase = new InitializeSatelliteUseCase(new GitHubApiAdapter(token));

      const result = await useCase.execute({
        mode: 'adopt',
        name: parsed.name,
        owner,
        topology,
        phase,
        existingRepoUrl: repoUrl,
      });

      this.promptService.stopSpinner();

      const { satellite } = result;

      console.log('');
      console.log(chalk.bold('Satellite adopted successfully'));
      console.log(`  ${chalk.cyan('ID:')}       ${satellite.id}`);
      console.log(`  ${chalk.cyan('Name:')}     ${satellite.name}`);
      console.log(`  ${chalk.cyan('Owner:')}    ${satellite.owner}`);
      console.log(`  ${chalk.cyan('Repo:')}     ${satellite.repoUrl}`);
      console.log(`  ${chalk.cyan('Topology:')} ${satellite.topology}`);
      console.log(`  ${chalk.cyan('Phase:')}    ${satellite.phase}`);
      console.log(`  ${chalk.cyan('Status:')}   ${chalk.green(satellite.status)}`);
      console.log('');

      this.promptService.showSuccess(`Satellite ${satellite.name} linked (${satellite.status})`);
      this.promptService.showOutro('Done.');
    } catch (error: unknown) {
      this.promptService.stopSpinner();
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Option parsers
  // --------------------------------------------------------------------------

  @Option({
    flags: '--repo <url>',
    description: 'GitHub repository URL (https://github.com/owner/repo)',
  })
  parseRepo(val: string): string {
    return val;
  }

  @Option({
    flags: '--topology <topology>',
    description: 'Architecture topology: monolith | modular | micro | distributed | custom',
  })
  parseTopology(val: string): string {
    return val;
  }

  @Option({
    flags: '--phase <phase>',
    description: 'SDLC phase: alpha | beta | rc | ga',
  })
  parsePhase(val: string): string {
    return val;
  }

  @Option({
    flags: '--token <token>',
    description: 'GitHub personal access token (defaults to GITHUB_TOKEN env var)',
  })
  parseToken(val: string): string {
    return val;
  }

  @Option({
    flags: '--owner <owner>',
    description: 'GitHub owner (user or organization); defaults to the owner parsed from --repo',
  })
  parseOwner(val: string): string {
    return val;
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /** Extract owner and repo name from a standard GitHub HTTPS URL. */
  private parseRepoUrl(url: string): { owner: string; name: string } {
    const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/);
    if (!match) {
      return { owner: '', name: '' };
    }
    return { owner: match[1], name: match[2] };
  }
}
