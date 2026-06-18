import { Command, Option } from 'nest-commander';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { WizardService, WizardStep } from '../../infrastructure/prompts/wizard.service';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { CatalogLoader } from '../../infrastructure/catalog/catalog-loader';
import { Inject } from '@nestjs/common';
import { IFileSystem } from '@evolith/core-domain/domain/interfaces';
import { InitializeProjectUseCase } from '@evolith/core-domain/application/services';
import chalk from 'chalk';

interface WizardInitOptions {
  wizard?: boolean;
  noInteractive?: boolean;
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

    if (!useWizard) {
      this.logger.log('Use "evolith init" for standard initialization');
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
        this.promptService.startSpinner('Creating project structure...');
        
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

        this.promptService.stopSpinner();

        if (initResult.success) {
          this.promptService.showSuccess(`Project ${result.projectName} created successfully!`);
          this.promptService.showInfo(`Artifacts: ${initResult.artifacts.length}`);
        } else {
          this.promptService.showError('Failed to create project');
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'UserCancelledError') {
        this.promptService.showInfo('Initialization cancelled');
        return;
      }
      throw error;
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
}
