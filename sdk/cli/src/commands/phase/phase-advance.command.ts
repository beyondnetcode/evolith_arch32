import { Command, Option } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import chalk from 'chalk';
import { ProposePhaseAdvanceUseCase } from '../../application/use-cases/propose-phase-advance.use-case';
import {
  ExecutionContext,
  OutputMeta,
  createErrorEnvelope,
  createSuccessEnvelope,
  isGatePhase,
  GATE_PHASES,
  ErrorCode,
  PhaseTransitionProposal,
  GatePhase,
} from '../../domain/gate-evidence';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';

interface PhaseAdvanceCommandOptions {
  from?: string;
  to?: string;
  project?: string;
  core?: string;
  format?: string;
  evaluatedBy?: string;
  initiative?: string;
  tenant?: string;
  webhookUrl?: string;
}

/**
 * `phase advance` — evaluates a proposed phase transition and emits the
 * transition proposal without canonical state mutation.
 */
@Command({
  name: 'phase',
  arguments: '<action>',
  description: 'Phase transition operations (action: advance) emitting a transition proposal',
})
export class PhaseAdvanceCommand extends BaseEvolithCommand {
  constructor(
    private readonly useCase: ProposePhaseAdvanceUseCase,
    promptService: PromptService
  ) {
    super('PhaseAdvanceCommand', promptService);
  }

  async executeCommand(inputs: string[], options?: PhaseAdvanceCommandOptions): Promise<void> {
    const startedAt = Date.now();
    const meta = (command: string): OutputMeta => {
      const context: ExecutionContext = {};
      if (options?.initiative) (context as { initiative?: string }).initiative = options.initiative;
      if (options?.tenant) (context as { tenant?: string }).tenant = options.tenant;
      const base: OutputMeta = {
        command,
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        correlationId: randomUUID(),
      };
      return Object.keys(context).length > 0 ? { ...base, context } : base;
    };
    const json = options?.format === 'json';
    const commandId = 'evolith phase advance';

    const fail = (code: ErrorCode, message: string): void => {
      if (json) {
        console.log(JSON.stringify(createErrorEnvelope(code, message, meta(commandId)), null, 2));
        process.exit(1);
      } else {
        throw new Error(message);
      }
    };

    const action = inputs[0];
    if (action !== 'advance') {
      return fail('VALIDATION_FAILED', `Unknown phase action '${action}'. Supported: advance`);
    }

    const fromPhase = options?.from ?? '';
    const toPhase = options?.to ?? '';

    if (!isGatePhase(fromPhase)) {
      return fail('INVALID_PHASE', `Invalid --from '${fromPhase}'. Valid phases: ${GATE_PHASES.join(', ')}`);
    }

    if (!isGatePhase(toPhase)) {
      return fail('INVALID_PHASE', `Invalid --to '${toPhase}'. Valid phases: ${GATE_PHASES.join(', ')}`);
    }

    const evaluatedBy = options?.evaluatedBy ?? 'agent';
    if (evaluatedBy !== 'human' && evaluatedBy !== 'agent' && evaluatedBy !== 'ci') {
      return fail('VALIDATION_FAILED', `Invalid --evaluated-by '${evaluatedBy}'. Valid: human, agent, ci`);
    }

    let proposal: PhaseTransitionProposal;
    try {
      proposal = await this.useCase.execute({
        fromPhase: fromPhase as GatePhase,
        toPhase: toPhase as GatePhase,
        projectPath: options?.project ?? process.cwd(),
        corePath: options?.core,
        evaluatedBy,
        webhookUrl: options?.webhookUrl,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const code: ErrorCode = message.includes('ruleset') ? 'RULESET_NOT_FOUND' : 'INTERNAL_ERROR';
      return fail(code, message);
    }

    if (json) {
      console.log(JSON.stringify(createSuccessEnvelope(proposal, meta(commandId)), null, 2));
    } else {
      this.printHuman(proposal);
    }

    if (!proposal.isRecommended) {
      process.exit(1);
    }
  }

  private printHuman(proposal: PhaseTransitionProposal): void {
    this.promptService.showIntro(`Phase Transition Proposal: ${proposal.fromPhase} -> ${proposal.toPhase}`);
    
    const color = proposal.isRecommended ? chalk.green : chalk.red;
    const recommendation = proposal.isRecommended ? 'RECOMMENDED' : 'NOT RECOMMENDED';
    this.promptService.showInfo(`Transition is ${color(recommendation)}`);
    
    const evidence = proposal.evidence;
    this.promptService.showInfo(`Evidence Verdict: ${evidence.verdict.toUpperCase()} (ruleset ${evidence.rulesetRef}@${evidence.rulesetVersion})`);
    
    for (const v of evidence.violations) {
      const tag = v.severity === 'error' ? chalk.red('[error]') : chalk.yellow('[warning]');
      this.promptService.showWarning(`${tag} ${v.ruleId} @ ${v.location}: ${v.message}`);
    }
    
    if (evidence.violations.length === 0) {
      this.promptService.showSuccess('No blocking violations found.');
    }
    
    this.promptService.showOutro(`Proposed at ${proposal.proposedAt}`);
  }

  @Option({ flags: '--from <phase>', description: 'Current SDLC phase' })
  parseFrom(val: string): string {
    return val;
  }

  @Option({ flags: '--to <phase>', description: 'Target SDLC phase' })
  parseTo(val: string): string {
    return val;
  }

  @Option({ flags: '--project [path]', description: 'Satellite project path (default: cwd)' })
  parseProject(val: string): string {
    return val;
  }

  @Option({ flags: '-c, --core [path]', description: 'Evolith Core path (default: auto-detect)' })
  parseCore(val: string): string {
    return val;
  }

  @Option({ flags: '-f, --format [string]', description: 'Output format: json (ADR-0073 envelope) or human (default)' })
  parseFormat(val: string): string {
    return val;
  }

  @Option({ flags: '--evaluated-by [actor]', description: 'Actor class: human, agent (default), ci' })
  parseEvaluatedBy(val: string): string {
    return val;
  }

  @Option({ flags: '--initiative [id]', description: 'Opaque initiative context, echoed in meta.context' })
  parseInitiative(val: string): string {
    return val;
  }

  @Option({ flags: '--tenant [id]', description: 'Opaque tenant context, echoed in meta.context' })
  parseTenant(val: string): string {
    return val;
  }

  @Option({ flags: '--webhook-url <url>', description: 'URL to POST the gate evidence upon completion' })
  parseWebhookUrl(val: string): string {
    return val;
  }
}
