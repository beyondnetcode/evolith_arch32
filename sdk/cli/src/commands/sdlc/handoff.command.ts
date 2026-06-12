import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { getContainer } from '../../core/di/container';
import { CatalogLoader } from '../../infrastructure/catalog/catalog-loader';
import { PhaseService, ToolSelectionService } from '../../domain/services';
import { PhaseTransitionUseCase } from '../../application/services';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';

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
export class HandoffCommand extends BaseEvolithCommand {
  private readonly phaseService: PhaseService;
  private readonly toolSelectionService: ToolSelectionService;

  constructor(private readonly catalogLoader: CatalogLoader) {
    super('HandoffCommand');
    this.phaseService = new PhaseService();
    this.toolSelectionService = new ToolSelectionService();
  }

  async executeCommand(
    passedParam: string[],
    options?: HandoffOptions,
  ): Promise<void> {
    const fs = getContainer().createFileSystem() as any;

    if (options?.from && options?.to) {
      const useCase = new PhaseTransitionUseCase(fs);
      const result = await useCase.execute(options.from, options.to, [], process.cwd());

      if (result.success) {
        this.promptService.showSuccess(`✓ Transitioned from ${options.from} to ${options.to}`);
      } else {
        throw new Error(`Transition failed: ${result.errors.join(', ')}`);
      }
      return;
    }

    console.clear();
    this.promptService.showIntro('Evolith SDLC - Phase Handoff');

    const phases = this.phaseService.getAllPhases();

    const fromPhase = await this.promptService.select({
      message: 'Select current phase:',
      options: phases.map(phase => ({
        value: phase.value,
        label: phase.label,
        hint: phase.description,
      })),
    });

    const currentPhase = this.phaseService.getPhase(fromPhase);
    const nextPhaseInfo = currentPhase ? this.phaseService.getNextPhase(currentPhase.value) : undefined;

    let toPhase = '';
    if (!nextPhaseInfo) {
      toPhase = await this.promptService.select({
        message: 'No next phase available.',
        options: [{ value: '', label: 'N/A' }],
      });
    } else {
      toPhase = await this.promptService.select({
        message: 'Select target phase:',
        options: [{
          value: nextPhaseInfo.value,
          label: nextPhaseInfo.label,
          hint: nextPhaseInfo.description,
        }],
        initialValue: nextPhaseInfo.value,
      });
    }

    const validateGates = await this.promptService.confirm('Validate phase gate requirements before handoff?', true);
    const uploadEvidence = await this.promptService.confirm('Generate/upload mandatory evidence artifacts?', true);
    const selectTools = await this.promptService.confirm('Configure tools for target phase?', true);

    const tools: string[] = [];
    if (selectTools) {
      const targetPhase = toPhase;
      const toolGroups = this.getToolGroupsForPhase(targetPhase);

      for (const [groupKey, group] of Object.entries(toolGroups)) {
        const useDefault = await this.promptService.confirm(`${group.question} (Default: ${group.defaultOption})`, true);

        if (!useDefault && group.options) {
          const selected = await this.promptService.multiselect({
            message: `Select ${groupKey} tools:`,
            options: group.options.map((o: any) => ({
              value: o.value,
              label: o.label,
              hint: o.hint
            })),
          });
          if (Array.isArray(selected) && selected.every((s: any) => typeof s === 'string')) {
            tools.push(...selected as string[]);
          }
        } else {
          const defaultTools = this.toolSelectionService.getDefaultTools(targetPhase);
          tools.push(...defaultTools);
        }
      }
    }

    const forceHandoff = await this.promptService.confirm('Force handoff even if some checks fail? (Requires waiver)', false);

    this.promptService.startSpinner(`Processing handoff from ${fromPhase} to ${toPhase}...`);

    const useCase = new PhaseTransitionUseCase(fs);
    const result = await useCase.execute(
      fromPhase,
      toPhase,
      tools,
      process.cwd()
    );

    this.promptService.stopSpinner();

    if (result.success) {
      this.promptService.showSuccess(`✓ Handoff ${fromPhase} → ${toPhase} completed`);

      if (result.gateResults.length > 0) {
        this.promptService.showInfo('\nGate Validation Results:');
        result.gateResults.forEach(gate => {
          const icon = gate.passed ? chalk.green('✓') : chalk.red('✗');
          const required = gate.required ? '[REQUIRED]' : '[OPTIONAL]';
          this.promptService.showInfo(`  ${icon} ${gate.id} ${required}: ${gate.description}`);
        });
      }

      if (result.executedTools.length > 0) {
        this.promptService.showInfo(`\nTools configured: ${result.executedTools.join(', ')}`);
      }

      const nextSteps = this.getNextSteps(toPhase);
      console.log(chalk.cyan(`\nNext Steps:\n${chalk.white(nextSteps)}`));
    } else {
      this.promptService.showError('✗ Handoff failed');
      result.errors.forEach(err => this.promptService.showError(`  - ${err}`));

      if (result.gateResults.some(g => !g.passed && g.required)) {
        this.promptService.showWarning('Fix failed required gates or use --force with Architecture Board waiver.');
      }
    }

    this.promptService.showOutro(result.success ? chalk.green('Completed') : chalk.red('Failed'));
  }

  private getToolGroupsForPhase(phase: string): Record<string, { question: string; defaultOption: string; options?: any[]; tools: string[] }> {
    const toolCatalog = this.catalogLoader.loadToolCatalog();
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