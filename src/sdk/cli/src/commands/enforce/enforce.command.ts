import { Command, Option } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import chalk from 'chalk';
import {
  compileRuleset,
  toDependencyCruiserConfig,
  type CompilableRule,
  type CompiledCheck,
  type FallbackNotice,
} from '@beyondnet/evolith-core-domain/application/validators/enforcement/policy-compiler';
import {
  OutputMeta,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
  createErrorEnvelope,
  createSuccessEnvelope,
  ErrorCode,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';
import { resolveCoreOverride } from '../../infrastructure/paths/core-resolver';
import { resolveRulesets } from '../../infrastructure/paths/rulesets-resolver';

interface EnforceCommandOptions {
  format?: string;
  file?: string;
  ruleset?: string;
  core?: string;
  output?: string;
}

/** Known ruleset ids the compiler can resolve against the Core rulesets root. */
const RULESET_ID_MAP: Readonly<Record<string, string>> = {
  'adr-0002': 'adr/adr-0002-hexagonal-architecture.rules.json',
};

/** The compiled-policy report emitted in the ADR-0073 envelope's `data`. */
interface CompiledPolicyReport {
  ruleset: string;
  action: 'compile';
  summary: {
    totalRules: number;
    enforcerRules: number;
    compiled: number;
    fallbacks: number;
    byTool: Record<string, number>;
    byFallback: { native: number; skip: number };
  };
  compiled: readonly CompiledCheck[];
  fallbacks: readonly FallbackNotice[];
  /** Ready-to-use `.dependency-cruiser` config fragment for the node checks. */
  dependencyCruiserConfig: { forbidden: ReadonlyArray<Readonly<Record<string, unknown>>> };
}

/**
 * `enforce compile` (GT-516 · EAG-10) — lowers a ruleset's `enforce:` blocks into
 * per-tool native check configuration via the {@link compileRuleset PolicyCompiler}
 * and reports, in the ADR-0073 envelope, both the compiled checks and the per-rule
 * fallbacks (rules a tool cannot express degrade gracefully instead of failing the
 * whole run). Real tool EXECUTION (`enforce run`) and the zero-false-positive
 * round-trip are gated on the GT-512 sandbox.
 */
@Command({
  name: 'enforce',
  arguments: '<action>',
  description: 'Enforcement operations (action: compile) — compile enforce: blocks into tool config',
})
export class EnforceCommand extends BaseEvolithCommand {
  constructor(promptService: PromptService, configService?: ConfigService) {
    super('EnforceCommand', promptService, configService);
  }

  async executeCommand(inputs: string[], options?: EnforceCommandOptions): Promise<void> {
    const startedAt = Date.now();
    const json = options?.format === 'json';
    const commandId = 'evolith enforce compile';
    const meta = (): OutputMeta => ({
      command: commandId,
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    });

    const fail = (code: ErrorCode, message: string): void => {
      if (json) {
        console.log(JSON.stringify(createErrorEnvelope(code, message, meta()), null, 2));
      } else {
        this.promptService.showError(message);
      }
      process.exit(1);
    };

    const action = inputs[0];
    if (action !== 'compile') {
      return fail('VALIDATION_FAILED', `Unknown enforce action '${action ?? ''}'. Supported: compile`);
    }

    if (!options?.file && !options?.ruleset) {
      return fail('VALIDATION_FAILED', 'Provide a ruleset to compile via --file <path> or --ruleset <id>');
    }

    let rulesetSource: string;
    try {
      rulesetSource = this.resolveRulesetPath(options);
    } catch (err) {
      return fail('RULESET_NOT_FOUND', err instanceof Error ? err.message : String(err));
    }

    let rules: CompilableRule[];
    try {
      rules = await this.loadRules(rulesetSource);
    } catch (err) {
      return fail('IO_ERROR', `Failed to load ruleset '${rulesetSource}': ${err instanceof Error ? err.message : String(err)}`);
    }

    const { compiled, fallbacks } = compileRuleset(rules);
    const enforcerRules = rules.filter((r) => r.enforce?.engine === 'enforcer').length;

    const byTool: Record<string, number> = {};
    for (const c of compiled) byTool[c.tool] = (byTool[c.tool] ?? 0) + 1;

    const report: CompiledPolicyReport = {
      ruleset: options?.ruleset ?? rulesetSource,
      action: 'compile',
      summary: {
        totalRules: rules.length,
        enforcerRules,
        compiled: compiled.length,
        fallbacks: fallbacks.length,
        byTool,
        byFallback: {
          native: fallbacks.filter((f) => f.fallback === 'native').length,
          skip: fallbacks.filter((f) => f.fallback === 'skip').length,
        },
      },
      compiled,
      fallbacks,
      dependencyCruiserConfig: toDependencyCruiserConfig(compiled),
    };

    const output = JSON.stringify(createSuccessEnvelope(report, meta()), null, 2);

    if (options?.output) {
      const fs = await import('fs-extra');
      await fs.writeFile(path.resolve(options.output), output, 'utf-8');
      if (!json) this.promptService.showSuccess(`Compiled policy written to ${options.output}`);
      return;
    }

    if (json) {
      console.log(output);
    } else {
      this.printHuman(report);
    }
  }

  /** Resolve the ruleset JSON path from `--file` (verbatim) or `--ruleset <id>`. */
  private resolveRulesetPath(options: EnforceCommandOptions): string {
    if (options.file) return path.resolve(options.file);

    const id = options.ruleset!;
    // A `--ruleset` that is itself an existing path is used verbatim.
    if (id.endsWith('.json')) return path.resolve(id);

    const relative = RULESET_ID_MAP[id.toLowerCase()] ?? `adr/${id}.rules.json`;
    const coreOverride = resolveCoreOverride({ explicit: options.core, profileCore: this.profile.core });
    const { rulesetsRoot } = resolveRulesets(coreOverride);
    return path.join(rulesetsRoot, relative);
  }

  /** Load and normalize a ruleset's rules, PRESERVING the `enforce` block. */
  private async loadRules(rulesetPath: string): Promise<CompilableRule[]> {
    const fs = await import('fs-extra');
    const raw = await fs.readFile(rulesetPath, 'utf-8');
    const parsed = JSON.parse(raw) as { rules?: unknown[] };
    const rules = Array.isArray(parsed.rules) ? parsed.rules : [];
    return rules.map((r) => {
      const rule = r as Record<string, unknown>;
      return {
        id: String(rule.id ?? ''),
        enforce: rule.enforce as CompilableRule['enforce'],
        category: rule.category as string | undefined,
        title: rule.title as string | undefined,
        blocking: rule.blocking as boolean | undefined,
        layer: rule.layer as string | undefined,
      };
    });
  }

  private printHuman(report: CompiledPolicyReport): void {
    this.promptService.showIntro(`Enforce compile — ${report.ruleset}`);
    const { summary } = report;
    this.promptService.showInfo(
      `Rules: ${summary.totalRules} total, ${summary.enforcerRules} enforcer-routed → ` +
        `${chalk.green(summary.compiled + ' compiled')}, ${chalk.yellow(summary.fallbacks + ' fallback')}`,
    );
    for (const c of report.compiled) {
      this.promptService.showInfo(`  ${chalk.green('✓')} ${c.ruleId} → ${c.tool} (${c.runtime}) [${c.mode}]`);
    }
    for (const f of report.fallbacks) {
      const tag = f.fallback === 'skip' ? chalk.gray('skip') : chalk.yellow('native');
      this.promptService.showWarning(`  [${tag}] ${f.ruleId} (${f.tool}): ${f.reason}`);
    }
    this.promptService.showOutro('Compile complete (advisory — real run gated on GT-512 sandbox).');
  }

  @Option({ flags: '-f, --format [string]', description: 'Output format: json (ADR-0073 envelope) or human (default)' })
  parseFormat(val: string): string {
    return val;
  }

  @Option({ flags: '--file [path]', description: 'Path to a ruleset JSON to compile' })
  parseFile(val: string): string {
    return val;
  }

  @Option({ flags: '-r, --ruleset [id]', description: 'Known ruleset id to compile (e.g. adr-0002)' })
  parseRuleset(val: string): string {
    return val;
  }

  @Option({ flags: '-c, --core [path]', description: 'Evolith Core path (default: auto-detect) — used to resolve --ruleset' })
  parseCore(val: string): string {
    return val;
  }

  @Option({ flags: '-o, --output [path]', description: 'Write the compiled-policy envelope to a file instead of stdout' })
  parseOutput(val: string): string {
    return val;
  }
}
