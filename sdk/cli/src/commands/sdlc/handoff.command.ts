import { Command, CommandRunner, Option } from 'nest-commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { getContainer } from '../../core/di/container';
import { catalogLoader } from '../../infrastructure/catalog/catalog-loader';
import { PhaseService, ToolSelectionService } from '../../domain/services';
import { PhaseTransitionUseCase } from '../../application/services';
import { EvolithError } from '../../core/errors';

interface HandoffOptions {
  from?: string;
  to?: string;
  artifacts?: boolean;
  validate?: boolean;
  force?: boolean;
}

@Command({
  name: 'handoff',
  description: 'Transitions artifacts between SDLC phases with interactive guided flow',
})
export class HandoffCommand extends CommandRunner {
  private readonly phaseService: PhaseService;
  private readonly toolSelectionService: ToolSelectionService;

  constructor() {
    super();
    this.phaseService = new PhaseService();
    this.toolSelectionService = new ToolSelectionService();
  }

  async run(
    passedParam: string[],
    options?: HandoffOptions,
  ): Promise<void> {
    const fs = getContainer().createFileSystem() as any;

    if (options?.from && options?.to) {
      const useCase = new PhaseTransitionUseCase(fs);
      const result = await useCase.execute(options.from, options.to, [], process.cwd());

      if (result.success) {
        p.log.success(`✓ Transitioned from ${options.from} to ${options.to}`);
      } else {
        p.log.error(`✗ Transition failed: ${result.errors.join(', ')}`);
        process.exit(1);
      }
      return;
    }

    console.clear();
    p.intro(chalk.bgCyan.white.bold(' Evolith SDLC - Phase Handoff '));

    const phases = this.phaseService.getAllPhases();

    const selection = await p.group({
      fromPhase: () => p.select({
        message: 'Select current phase:',
        options: phases.map(phase => ({
          value: phase.value,
          label: phase.label,
          hint: phase.description,
        })),
      }),

      toPhase: ({ results }) => {
        const currentPhase = this.phaseService.getPhase(results.fromPhase as string);
        const nextPhase = currentPhase ? this.phaseService.getNextPhase(currentPhase.value) : undefined;

        if (!nextPhase) {
          return p.select({
            message: 'No next phase available.',
            options: [{ value: '', label: 'N/A' }],
          });
        }

        return p.select({
          message: 'Select target phase:',
          options: [{
            value: nextPhase.value,
            label: nextPhase.label,
            hint: nextPhase.description,
          }],
          initialValue: nextPhase.value,
        });
      },

      validateGates: () => p.confirm({
        message: 'Validate phase gate requirements before handoff?',
        initialValue: true,
      }),

      uploadEvidence: () => p.confirm({
        message: 'Generate/upload mandatory evidence artifacts?',
        initialValue: true,
      }),

      selectTools: () => p.confirm({
        message: 'Configure tools for target phase?',
        initialValue: true,
      }),

      tools: async ({ results }) => {
        if (!results.selectTools) return [];

        const targetPhase = results.toPhase as string;
        const toolGroups = this.getToolGroupsForPhase(targetPhase);
        const selectedTools: string[] = [];

        for (const [groupKey, group] of Object.entries(toolGroups)) {
          const useDefault = await p.confirm({
            message: `${group.question} (Default: ${group.defaultOption})`,
            initialValue: true,
          });

          if (!useDefault && group.options) {
            const selected = await p.multiselect({
              message: `Select ${groupKey} tools:`,
              options: group.options,
            });
            if (Array.isArray(selected) && selected.every(s => typeof s === 'string')) {
              selectedTools.push(...selected as string[]);
            }
          } else {
            const defaultTools = this.toolSelectionService.getDefaultTools(targetPhase);
            selectedTools.push(...defaultTools);
          }
        }

        return selectedTools;
      },

      forceHandoff: () => p.confirm({
        message: 'Force handoff even if some checks fail? (Requires waiver)',
        initialValue: false,
      }),
    }, {
      onCancel: () => {
        p.cancel('Handoff cancelled.');
        process.exit(0);
      }
    });

    const spinner = p.spinner();
    spinner.start(`Processing handoff from ${selection.fromPhase} to ${selection.toPhase}...`);

    const useCase = new PhaseTransitionUseCase(fs);
    const result = await useCase.execute(
      selection.fromPhase as string,
      selection.toPhase as string,
      (selection.tools as string[]) || [],
      process.cwd()
    );

    spinner.stop();

    if (result.success) {
      p.log.success(chalk.green(`✓ Handoff ${selection.fromPhase} → ${selection.toPhase} completed`));

      if (result.gateResults.length > 0) {
        p.log.info('\nGate Validation Results:');
        result.gateResults.forEach(gate => {
          const icon = gate.passed ? chalk.green('✓') : chalk.red('✗');
          const required = gate.required ? '[REQUIRED]' : '[OPTIONAL]';
          p.log.info(`  ${icon} ${gate.id} ${required}: ${gate.description}`);
        });
      }

      if (result.executedTools.length > 0) {
        p.log.info(`\nTools configured: ${result.executedTools.join(', ')}`);
      }

      const nextSteps = this.getNextSteps(selection.toPhase as string);
      p.note(nextSteps, 'Next Steps');
    } else {
      p.log.error(chalk.red('✗ Handoff failed'));
      result.errors.forEach(err => p.log.error(`  - ${err}`));

      if (result.gateResults.some(g => !g.passed && g.required)) {
        p.log.warn('Fix failed required gates or use --force with Architecture Board waiver.');
      }
    }

    p.outro(result.success ? chalk.green('Completed') : chalk.red('Failed'));
  }

  private getToolGroupsForPhase(phase: string): Record<string, { question: string; defaultOption: string; options?: any[]; tools: string[] }> {
    const toolCatalog = catalogLoader.loadToolCatalog();
    const phaseDef = toolCatalog.phases[phase];

    if (!phaseDef) {
      return {};
    }

    return phaseDef.toolGroups;
  }

  private getNextSteps(phase: string): string {
    const steps: Record<string, string> = {
      'phase-1': '1. evolith validate\n2. evolith agents install\n3. evolith sdlc handoff --from phase-1 --to phase-2',
      'phase-2': '1. evolith validate\n2. Review rulesets in rulesets/\n3. evolith sdlc handoff --from phase-2 --to phase-3',
      'phase-3': '1. Create ADRs for architectural decisions\n2. Map bounded contexts\n3. evolith sdlc handoff --from phase-3 --to phase-4',
      'phase-4': '1. Review CI/CD pipeline\n2. Configure observability\n3. evolith sdlc handoff --from phase-4 --to phase-5',
      'phase-5': '1. Monitor DORA metrics\n2. Set up alerting\n3. Project is production-ready',
    };
    return steps[phase] || '';
  }

  @Option({
    flags: '-f, --from [phase]',
    description: 'Source phase (phase-0, phase-1, etc.)',
  })
  parseFrom(val: string): string {
    return val;
  }

  @Option({
    flags: '-t, --to [phase]',
    description: 'Target phase (phase-0, phase-1, etc.)',
  })
  parseTo(val: string): string {
    return val;
  }

  @Option({
    flags: '-a, --artifacts',
    description: 'Generate evidence artifacts',
  })
  parseArtifacts(): boolean {
    return true;
  }

  @Option({
    flags: '--validate',
    description: 'Validate phase gates',
  })
  parseValidate(): boolean {
    return true;
  }

  @Option({
    flags: '--force',
    description: 'Force handoff despite failed gates',
  })
  parseForce(): boolean {
    return true;
  }
}