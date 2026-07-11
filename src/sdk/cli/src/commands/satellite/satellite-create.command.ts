import { Command, Option } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import chalk from 'chalk';
import { InitializeSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases/initialize-satellite.use-case';
import { GitHubApiAdapter } from '@beyondnet/evolith-infra-providers';
import {
  createSuccessEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';

type SatelliteTopologyOption = 'monolith' | 'modular' | 'micro' | 'distributed';
type SatellitePhaseOption = 'discovery' | 'design' | 'construction' | 'qa' | 'release';

interface SatelliteCreateCommandOptions {
  name?: string;
  owner?: string;
  topology?: SatelliteTopologyOption;
  phase?: SatellitePhaseOption;
  private?: boolean;
  description?: string;
  token?: string;
  format?: string;
}

@Command({
  name: 'satellite:create',
  description: 'Create a new GitHub satellite repository and register it with Evolith',
})
export class SatelliteCreateCommand extends BaseEvolithCommand {
  constructor(
    promptService: PromptService,
    configService?: ConfigService,
  ) {
    super('SatelliteCreateCommand', promptService, configService);
  }

  async executeCommand(_passedParam: string[], options?: SatelliteCreateCommandOptions): Promise<void> {
    const json = (options?.format as string | undefined) === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith satellite:create',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    if (!json) {
      this.promptService.showIntro('Evolith SDK - Satellite Create');
    }

    const name = options?.name ?? await this.promptService.text({
      message: 'Repository name:',
      placeholder: 'my-satellite',
      validate: (v) => (v.trim().length === 0 ? 'Name is required' : undefined),
    });

    const owner = options?.owner ?? await this.promptService.text({
      message: 'GitHub owner (user or organisation):',
      placeholder: 'my-org',
      validate: (v) => (v.trim().length === 0 ? 'Owner is required' : undefined),
    });

    const topology: SatelliteTopologyOption = options?.topology ?? await this.promptService.select<SatelliteTopologyOption>({
      message: 'Architecture topology:',
      options: [
        { value: 'monolith', label: 'Monolith', hint: 'Single deployable unit' },
        { value: 'modular', label: 'Modular monolith', hint: 'Modular boundaries, single deployment' },
        { value: 'micro', label: 'Microservices', hint: 'Independent deployable services' },
        { value: 'distributed', label: 'Distributed', hint: 'Event-driven distributed system' },
      ],
      initialValue: 'modular',
    });

    const phase: SatellitePhaseOption = options?.phase ?? await this.promptService.select<SatellitePhaseOption>({
      message: 'Initial SDLC phase:',
      options: [
        { value: 'discovery', label: 'Discovery' },
        { value: 'design', label: 'Design' },
        { value: 'construction', label: 'Construction' },
        { value: 'qa', label: 'QA' },
        { value: 'release', label: 'Release' },
      ],
      initialValue: 'discovery',
    });

    const token = options?.token ?? process.env['GITHUB_TOKEN'] ?? '';

    if (!token) {
      const error = 'GitHub token not found. Pass --token or set the GITHUB_TOKEN environment variable.';
      if (json) {
        console.log(
          JSON.stringify(
            createSuccessEnvelope(
              { success: false, error },
              { ...meta, durationMs: Date.now() - startedAt },
            ),
            null,
            2,
          ),
        );
        return;
      }
      this.promptService.showError(error);
      this.promptService.showOutro('Satellite creation cancelled.');
      return;
    }

    if (!json) {
      this.promptService.startSpinner(`Creating repository ${owner}/${name} on GitHub...`);
    }

    try {
      const githubClient = new GitHubApiAdapter(token);
      const useCase = new InitializeSatelliteUseCase(githubClient);

      const result = await useCase.execute({
        mode: 'create',
        name: name.trim(),
        owner: owner.trim(),
        topology,
        phase,
        description: options?.description,
        private: options?.private ?? false,
      });

      if (!json) {
        this.promptService.stopSpinner('Repository created.');
      }

      const { satellite } = result;

      if (json) {
        console.log(
          JSON.stringify(
            createSuccessEnvelope({ satellite }, { ...meta, durationMs: Date.now() - startedAt }),
            null,
            2,
          ),
        );
      } else {
        console.log(`\n${chalk.bgGreen.black(' Satellite Registered ')}\n`);
        console.log(`${chalk.bold('ID:')}       ${chalk.cyan(satellite.id)}`);
        console.log(`${chalk.bold('Name:')}     ${chalk.cyan(satellite.name)}`);
        console.log(`${chalk.bold('Owner:')}    ${chalk.cyan(satellite.owner)}`);
        console.log(`${chalk.bold('Repo URL:')} ${chalk.underline(satellite.repoUrl)}`);
        console.log(`${chalk.bold('Topology:')} ${satellite.topology}`);
        console.log(`${chalk.bold('Phase:')}    ${satellite.phase}`);
        console.log(`${chalk.bold('Status:')}   ${chalk.green(satellite.status)}`);
        console.log('');

        this.promptService.showSuccess(`Satellite "${satellite.name}" successfully created and registered.`);
        this.promptService.showOutro('Done. Run `evolith satellite adopt` to link an existing repo.');
      }
    } catch (error: unknown) {
      if (!json) {
        this.promptService.stopSpinner('Failed.');
      }
      throw error;
    }
  }

  @Option({
    flags: '-n, --name [name]',
    description: 'Name for the new GitHub repository',
  })
  parseName(val: string): string {
    return val;
  }

  @Option({
    flags: '-o, --owner [owner]',
    description: 'GitHub user or organisation that will own the repository',
  })
  parseOwner(val: string): string {
    return val;
  }

  @Option({
    flags: '--topology [topology]',
    description: 'Architecture topology: monolith | modular | micro | distributed',
  })
  parseTopology(val: string): SatelliteTopologyOption {
    return val as SatelliteTopologyOption;
  }

  @Option({
    flags: '--phase [phase]',
    description: 'Initial SDLC phase: discovery | design | construction | qa | release',
  })
  parsePhase(val: string): SatellitePhaseOption {
    return val as SatellitePhaseOption;
  }

  @Option({
    flags: '--private',
    description: 'Create the repository as private (default: public)',
  })
  parsePrivate(): boolean {
    return true;
  }

  @Option({
    flags: '-d, --description [description]',
    description: 'Optional description for the repository',
  })
  parseDescription(val: string): string {
    return val;
  }

  @Option({
    flags: '-t, --token [token]',
    description: 'GitHub personal access token (falls back to GITHUB_TOKEN env var)',
  })
  parseToken(val: string): string {
    return val;
  }

  @Option({
    flags: '-f, --format <string>',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }
}
