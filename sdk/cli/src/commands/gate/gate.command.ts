import { Command, CommandRunner, Option } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { EvaluateGateUseCase } from '../../application/use-cases/evaluate-gate.use-case';
import {
  ExecutionContext,
  GateEvidence,
  OutputMeta,
  createErrorEnvelope,
  createSuccessEnvelope,
  isGatePhase,
  GATE_PHASES,
  ErrorCode,
} from '../../domain/gate-evidence';

interface GateCommandOptions {
  phase?: string;
  project?: string;
  core?: string;
  format?: string;
  evaluatedBy?: string;
  initiative?: string;
  tenant?: string;
}

/**
 * `gate evaluate` — evaluates one SDLC phase gate and emits the ADR-0073
 * contract: GateEvidence wrapped in the machine output envelope when
 * `--format json`, human-readable output otherwise.
 */
@Command({
  name: 'gate',
  arguments: '<action>',
  description: 'Phase gate operations (action: evaluate) emitting ADR-0073 GateEvidence',
})
export class GateCommand extends CommandRunner {
  private readonly useCase = new EvaluateGateUseCase();

  async run(inputs: string[], options?: GateCommandOptions): Promise<void> {
    const startedAt = Date.now();
    const meta = (command: string): OutputMeta => {
      const context: ExecutionContext = {};
      if (options?.initiative) (context as { initiative?: string }).initiative = options.initiative;
      if (options?.tenant) (context as { tenant?: string }).tenant = options.tenant;
      if (options?.phase) (context as { phase?: string }).phase = options.phase;
      const base: OutputMeta = {
        command,
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        correlationId: randomUUID(),
      };
      return Object.keys(context).length > 0 ? { ...base, context } : base;
    };
    const json = options?.format === 'json';
    const commandId = 'evolith gate evaluate';

    const fail = (code: ErrorCode, message: string): void => {
      if (json) {
        console.log(JSON.stringify(createErrorEnvelope(code, message, meta(commandId)), null, 2));
      } else {
        p.log.error(chalk.red(message));
      }
      process.exit(1);
    };

    const action = inputs[0];
    if (action !== 'evaluate') {
      return fail('VALIDATION_FAILED', `Unknown gate action '${action}'. Supported: evaluate`);
    }

    const phase = options?.phase ?? '';
    if (!isGatePhase(phase)) {
      return fail('INVALID_PHASE', `Invalid --phase '${phase}'. Valid phases: ${GATE_PHASES.join(', ')}`);
    }

    const evaluatedBy = options?.evaluatedBy ?? 'human';
    if (evaluatedBy !== 'human' && evaluatedBy !== 'agent' && evaluatedBy !== 'ci') {
      return fail('VALIDATION_FAILED', `Invalid --evaluated-by '${evaluatedBy}'. Valid: human, agent, ci`);
    }

    let evidence: GateEvidence;
    try {
      evidence = await this.useCase.execute({
        phase,
        projectPath: options?.project ?? process.cwd(),
        corePath: options?.core,
        evaluatedBy,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const code: ErrorCode = message.includes('ruleset') ? 'RULESET_NOT_FOUND' : 'INTERNAL_ERROR';
      return fail(code, message);
    }

    if (json) {
      console.log(JSON.stringify(createSuccessEnvelope(evidence, meta(commandId)), null, 2));
    } else {
      this.printHuman(evidence);
    }

    if (evidence.verdict === 'failed') {
      process.exit(1);
    }
  }

  private printHuman(evidence: GateEvidence): void {
    p.intro(chalk.cyan(`Gate ${evidence.gateId} — phase ${evidence.phase}`));
    const color = evidence.verdict === 'passed' ? chalk.green : chalk.red;
    p.log.info(`Verdict: ${color(evidence.verdict.toUpperCase())} (ruleset ${evidence.rulesetRef}@${evidence.rulesetVersion})`);
    for (const v of evidence.violations) {
      const tag = v.severity === 'error' ? chalk.red('[error]') : chalk.yellow('[warning]');
      p.log.warn(`${tag} ${v.ruleId} @ ${v.location}: ${v.message}`);
    }
    if (evidence.violations.length === 0) {
      p.log.success('No violations.');
    }
    p.outro(`Evaluated by ${evidence.evaluatedBy} at ${evidence.evaluatedAt}`);
  }

  @Option({ flags: '-p, --phase <phase>', description: 'SDLC phase: discovery, design, construction, qa, release' })
  parsePhase(val: string): string {
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

  @Option({ flags: '--evaluated-by [actor]', description: 'Actor class: human (default), agent, ci' })
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
}
