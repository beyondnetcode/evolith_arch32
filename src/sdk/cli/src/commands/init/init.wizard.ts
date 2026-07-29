import { Command, Option } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { WizardService, WizardStep } from '../../infrastructure/prompts/wizard.service';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { CatalogLoader } from '../../infrastructure/catalog/catalog-loader';
import { Inject } from '@nestjs/common';
import { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { createSuccessEnvelope, createErrorEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION, type ErrorCode } from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { InitializeProjectUseCase } from '@beyondnet/evolith-core-domain/application/services';
import { carriesCliExitCode, resolveExitCode } from '../../infrastructure/cli/exit-codes';

interface WizardInitOptions {
  wizard?: boolean;
  noInteractive?: boolean;
  format?: string;
}

@Command({
  name: 'init-wizard',
  description: 'Interactive wizard for project initialization',
})
export class InitWizardCommand extends BaseEvolithCommand {
  constructor(
    private readonly wizardService: WizardService,
    promptService: PromptService,
    private readonly catalogLoader: CatalogLoader,
    @Inject('IFileSystem') private readonly fileSystem: IFileSystem
  ) {
    super('InitWizardCommand', promptService);
  }

  async executeCommand(
    passedParam: string[],
    options?: WizardInitOptions
  ): Promise<void> {
    const useWizard = options?.wizard ?? true;
    const noInteractive = options?.noInteractive ?? false;
    const json = options?.format === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith init-wizard',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
      startedAt,
    };

    if (!useWizard) {
      const message = 'Use "evolith init" for standard initialization';
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('VALIDATION_FAILED', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        this.logger.log(message);
      }
      return;
    }

    const fs = this.fileSystem;
    const useCase = new InitializeProjectUseCase(fs, this.catalogLoader);

    const steps: WizardStep[] = [
      {
        id: 'project-name',
        title: 'Project Name',
        description: 'Enter your project name',
        run: async () => {
          const name = await this.promptService.text({
            message: 'What is your project name?',
            placeholder: 'my-evolith-project',
            validate: (value) => {
              if (!value || value.length < 3) {
                return 'Project name must be at least 3 characters';
              }
              return undefined;
            },
          });
          return { projectName: name };
        },
      },
      {
        id: 'runtime',
        title: 'Runtime Selection',
        description: 'Choose your runtime environment',
        run: async () => {
          const runtime = await this.promptService.select({
            message: 'Select runtime:',
            options: [
              { value: 'nodejs', label: 'Node.js' },
              { value: 'dotnet', label: '.NET' },
              { value: 'android', label: 'Android' },
            ],
          });
          return { runtime };
        },
      },
      {
        id: 'monorepo',
        title: 'Monorepo Configuration',
        description: 'Configure monorepo structure',
        run: async () => {
          const monorepo = await this.promptService.select({
            message: 'Monorepo setup:',
            options: [
              { value: 'none', label: 'Single project' },
              { value: 'npm', label: 'NPM workspaces' },
              { value: 'pnpm', label: 'pnpm workspaces' },
            ],
          });
          return { monorepo };
        },
      },
      {
        id: 'architecture',
        title: 'Architecture Pattern',
        description: 'Select architecture pattern',
        run: async () => {
          const arch = await this.promptService.select({
            message: 'Architecture:',
            options: [
              { value: 'clean', label: 'Clean Architecture' },
              { value: 'hexagonal', label: 'Hexagonal' },
              { value: 'layered', label: 'Layered' },
            ],
          });
          return { arch };
        },
      },
    ];

    try {
      const result = await this.wizardService.start({
        title: 'Evolith Project Initialization Wizard',
        steps,
        noInteractive,
      });

      if (result && result.projectName) {
        if (!json) {
          this.promptService.startSpinner('Creating project structure...');
        }

        const initResult = await useCase.execute({
          name: result.projectName as string,
          runtime: result.runtime as string,
          monorepo: result.monorepo as string,
          architecture: result.arch as string,
          database: 'none',
          apiProtocol: 'rest',
          ciCd: 'none',
          observability: 'none',
          features: [],
          agents: [],
        }, process.cwd());

        if (!json) {
          this.promptService.stopSpinner();
        }

        if (initResult.success) {
          if (json) {
            const response = {
              projectName: result.projectName,
              artifacts: initResult.artifacts,
            };
            console.log(JSON.stringify(createSuccessEnvelope(response, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
          } else {
            this.promptService.showSuccess(`Project ${result.projectName} created successfully!`);
            this.promptService.showInfo(`Artifacts: ${initResult.artifacts.length}`);
          }
        } else {
          const message = 'Failed to create project';
          if (json) {
            process.exitCode = 1;
            console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - startedAt }, { errors: initResult.errors }), null, 2));
          } else {
            this.promptService.showError(message);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'UserCancelledError') {
        const message = 'Initialization cancelled';
        if (json) {
          process.exitCode = 1;
          console.log(JSON.stringify(createErrorEnvelope('VALIDATION_FAILED', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        } else {
          this.promptService.showInfo(message);
        }
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      if (json) {
        // GT-580: a carrier error (e.g. `NonInteractiveError` on a non-TTY)
        // already knows its taxonomy classification — collapsing it to
        // INTERNAL_ERROR here would lose that and make the envelope disagree
        // with the exit code.
        const code: ErrorCode = carriesCliExitCode(error) && error.envelopeErrorCode
          ? (error.envelopeErrorCode as ErrorCode)
          : 'INTERNAL_ERROR';
        process.exitCode = resolveExitCode(error);
        console.log(JSON.stringify(createErrorEnvelope(code, message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        throw error;
      }
    }
  }

  @Option({
    flags: '--no-wizard',
    description: 'Use standard init instead of wizard',
  })
  parseNoWizard(): boolean {
    return true;
  }

  @Option({
    flags: '--no-interactive',
    description: 'Run in non-interactive mode (CI/automation)',
  })
  parseNoInteractive(): boolean {
    return true;
  }

  @Option({
    flags: '-f, --format [string]',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }
}
