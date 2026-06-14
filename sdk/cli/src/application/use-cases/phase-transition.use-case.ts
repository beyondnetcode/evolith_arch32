import { IFileSystem } from '../../domain/interfaces';
import { PhaseService } from '../../domain/services';
import { IWebhookNotifier } from '../ports/webhook-notifier.port';
import { PhaseGateValidatorService } from '../validators/phase-gate-validator.service';
import { PhaseTransitionResult, GateResult } from '../services/index';

export class PhaseTransitionUseCase {
  private readonly fs: IFileSystem;
  private readonly phaseService: PhaseService;
  private readonly gateValidator: PhaseGateValidatorService;

  constructor(
    fs: IFileSystem,
    corePath?: string,
    private readonly webhookNotifier?: IWebhookNotifier,
    logger?: any
  ) {
    this.fs = fs;
    this.phaseService = new PhaseService();
    const safeLogger = logger || { log: () => {}, warn: () => {}, error: () => {}, info: () => {}, debug: () => {} };
    this.gateValidator = new PhaseGateValidatorService(corePath, { fileSystem: fs, logger: safeLogger });
  }

  async execute(from: string, to: string, tools: string[], cwd: string): Promise<PhaseTransitionResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!this.phaseService.canTransition(from, to)) {
      errors.push(`Invalid phase transition: ${from} → ${to}. Must be consecutive phases.`);
      return { success: false, from, to, gateResults: [], executedTools: [], warnings, errors };
    }

    const targetPhaseNumber = this.phaseService.getPhaseIndex(to);
    const gateResults = targetPhaseNumber >= 0
      ? await this.validateGatesWithValidator(targetPhaseNumber, cwd)
      : await this.validateGatesLegacy(from, cwd);

    const failedRequiredGates = gateResults.filter(g => !g.passed && g.required);

    if (failedRequiredGates.length > 0) {
      errors.push(...failedRequiredGates.map(g => `Gate ${g.id} failed: ${g.description}`));
    }

    const executedTools: string[] = [];
    for (const tool of tools) {
      executedTools.push(tool);
    }

    return {
      success: errors.length === 0,
      from,
      to,
      gateResults,
      executedTools,
      warnings,
      errors,
    };
  }

  async getGateStatus(cwd: string) {
    return this.gateValidator.getGateStatus(cwd);
  }

  private async validateGatesWithValidator(phaseNumber: number, cwd: string): Promise<GateResult[]> {
    try {
      const result = await this.gateValidator.validateGate(phaseNumber, cwd);
      const gates: GateResult[] = [];

      for (const evidence of result.evidenceResults) {
        gates.push({
          id: `${result.gateId}-${evidence.artifact.replace(/\\s+/g, '-')}`,
          passed: evidence.passed,
          description: evidence.validationMessage,
          required: evidence.required,
        });
      }

      for (const blocking of result.blockingChecks) {
        if (blocking.triggered) {
          gates.push({
            id: `${result.gateId}-BLOCK-${blocking.criterion.replace(/\\s+/g, '-').substring(0, 30)}`,
            passed: false,
            description: `Blocking: ${blocking.criterion} — ${blocking.action}`,
            required: true,
          });
        }
      }

      return gates;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Gate validator failed, falling back to legacy validation: ${message}`);
      return this.validateGatesLegacy(this.phaseService.getAllPhases()[phaseNumber]?.value || 'phase-0', cwd);
    }
  }

  private async validateGatesLegacy(phase: string, cwd: string): Promise<GateResult[]> {
    const gates: GateResult[] = [];
    const evolithYamlPath = `${cwd}/evolith.yaml`;

    switch (phase) {
      case 'phase-0':
        gates.push({ id: 'PG0-01', passed: await this.fs.exists(evolithYamlPath), description: 'evolith.yaml exists', required: true });
        if (await this.fs.exists(evolithYamlPath)) {
          const config = await this.fs.readJson(evolithYamlPath) as { coreRef?: { version?: string } };
          gates.push({ id: 'PG0-02', passed: !!config.coreRef?.version, description: 'coreRef.version pinned', required: true });
        }
        break;
      case 'phase-1':
        gates.push({ id: 'PG1-01', passed: await this.fs.exists(`${cwd}/package.json`), description: 'package.json exists', required: true });
        gates.push({ id: 'PG1-02', passed: await this.fs.exists(`${cwd}/src`), description: 'src/ directory exists', required: true });
        break;
      case 'phase-2':
        gates.push({ id: 'PG2-01', passed: await this.fs.exists(`${cwd}/rulesets`), description: 'rulesets/ exists', required: true });
        gates.push({ id: 'PG2-02', passed: await this.fs.exists(`${cwd}/.harness`), description: '.harness/ exists', required: true });
        break;
    }

    return gates;
  }
}
