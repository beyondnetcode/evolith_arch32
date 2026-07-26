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
import { loadBoundaryRules } from '../../infrastructure/agent/edit-hook/boundary-rules';
import {
  enforceEditPayload,
  renderEditVerdict,
  readStdin,
  EDIT_HOOK_BLOCK_EXIT_CODE,
} from '../../infrastructure/agent/edit-hook/edit-hook.service';
import { normalizeEditIntent, type RawHookPayload } from '../../infrastructure/agent/edit-hook/hook-payload';

interface EnforceCommandOptions {
  format?: string;
  file?: string;
  ruleset?: string;
  core?: string;
  output?: string;
  rules?: string;
  payload?: string;
  vendor?: string;
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
  description:
    'Enforcement operations — compile: lower enforce: blocks into tool config; edit: edit-time cross-agent gate (PreToolUse hook)',
})
export class EnforceCommand extends BaseEvolithCommand {
  constructor(promptService: PromptService, configService?: ConfigService) {
    super('EnforceCommand', promptService, configService);
  }

  async executeCommand(inputs: string[], options?: EnforceCommandOptions): Promise<void> {
    const startedAt = Date.now();
    const json = options?.format === 'json';
    const ndjson = options?.format === 'ndjson';
    const isStructured = json || ndjson;
    const commandId = 'evolith enforce compile';
    const meta = (): OutputMeta => ({
      command: commandId,
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    });

    const fail = (code: ErrorCode, message: string): void => {
      if (isStructured) {
        console.log(JSON.stringify(createErrorEnvelope(code, message, meta()), null, json ? 2 : 0));
      } else {
        this.promptService.showError(message);
      }
      process.exit(1);
    };

    const action = inputs[0];
    if (action === 'edit') {
      return this.executeEditGate(options);
    }
    if (action !== 'compile') {
      return fail('VALIDATION_FAILED', `Unknown enforce action '${action ?? ''}'. Supported: compile, edit`);
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

    if (isStructured) {
      const envelope = createSuccessEnvelope(report, meta());
      const output = ndjson ? JSON.stringify(envelope) : JSON.stringify(envelope, null, 2);
      if (options?.output) {
        const fs = await import('fs-extra');
        await fs.writeFile(path.resolve(options.output), output, 'utf-8');
      } else {
        console.log(output);
      }
    } else {
      if (options?.output) {
        const output = JSON.stringify(createSuccessEnvelope(report, meta()), null, 2);
        const fs = await import('fs-extra');
        await fs.writeFile(path.resolve(options.output), output, 'utf-8');
        this.promptService.showSuccess(`Compiled policy written to ${options.output}`);
      } else {
        this.printHuman(report);
      }
    }
  }

  /**
   * `enforce edit` (GT-526 · axis 2) — the edit-time cross-agent gate. Reads an edit intent from
   * an agent hook payload (Claude Code `PreToolUse` on stdin, or `--payload`; Cursor/Copilot via
   * the generic normalized shape), evaluates the edited file's imports against the compiled
   * boundary contract (`--rules`), and returns a DETERMINISTIC allow/block. On block it prints the
   * canonical Violations to stderr and exits `2` — the code an agent runtime honors to reject the
   * pending write in-flight, before the PR. PR/CI (GT-518) stays the authoritative gate.
   */
  private async executeEditGate(options?: EnforceCommandOptions): Promise<void> {
    const startedAt = Date.now();
    const json = options?.format === 'json';
    const ndjson = options?.format === 'ndjson';
    const isStructured = json || ndjson;
    const commandId = 'evolith enforce edit';
    const meta = (): OutputMeta => ({
      command: commandId,
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    });
    const fail = (code: ErrorCode, message: string): void => {
      if (isStructured) {
        console.log(JSON.stringify(createErrorEnvelope(code, message, meta()), null, json ? 2 : 0));
      } else {
        this.promptService.showError(message);
      }
      process.exit(1);
    };

    if (!options?.rules) {
      return fail('VALIDATION_FAILED', 'Provide the compiled boundary contract via --rules <path>');
    }

    let rawJson: string;
    try {
      rawJson = options.payload ?? (await readStdin());
    } catch (err) {
      return fail('IO_ERROR', `Failed to read hook payload from stdin: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!rawJson || rawJson.trim().length === 0) {
      return fail('VALIDATION_FAILED', 'Empty hook payload — pass JSON on stdin or via --payload <json>');
    }

    let payload: RawHookPayload;
    try {
      payload = JSON.parse(rawJson);
    } catch (err) {
      return fail('VALIDATION_FAILED', `Hook payload is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
    }

    // GT-578: Barrera de pre-parseo para pasos vacuos
    const intent = normalizeEditIntent(payload, options.vendor);
    if (!intent) {
      // Es vacuo (ej. comando de solo lectura de un agente).
      // Salimos rápido con exit 0 sin incurrir en el costo del motor de reglas.
      if (isStructured) {
        const data = { action: 'edit' as const, vendor: null, blocked: false };
        console.log(JSON.stringify(createSuccessEnvelope(data, meta()), null, json ? 2 : 0));
      } else {
        this.promptService.showInfo('edit-gate: no file edit in payload — nothing to enforce (allow).');
      }
      process.exit(0);
    }

    let rules;
    try {
      rules = await loadBoundaryRules(path.resolve(options.rules));
    } catch (err) {
      const code = err instanceof Error && err.name === 'BoundaryRulesError' ? 'VALIDATION_FAILED' : 'IO_ERROR';
      return fail(code, `Failed to load boundary rules '${options.rules}': ${err instanceof Error ? err.message : String(err)}`);
    }

    const result = enforceEditPayload(payload, rules, options.vendor);

    if (isStructured) {
      const data = {
        action: 'edit' as const,
        vendor: result.vendor,
        file: result.filePath,
        allow: result.decision.allow,
        blocked: result.blocked,
        violations: result.decision.violations,
      };
      console.log(JSON.stringify(createSuccessEnvelope(data, meta()), null, json ? 2 : 0));
    } else {
      const verdict = renderEditVerdict(result);
      // Route to stderr so an agent runtime surfaces it back to the model on block.
      if (result.blocked) console.error(verdict);
      else this.promptService.showInfo(verdict);
    }

    if (result.blocked) process.exit(EDIT_HOOK_BLOCK_EXIT_CODE);
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

  @Option({ flags: '-f, --format [string]', description: 'Output format: json (ADR-0073 envelope), ndjson, or human (default)' })
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

  @Option({
    flags: '--rules [path]',
    description: 'edit: path to the compiled boundary contract (EditBoundaryRule[] JSON)',
  })
  parseRules(val: string): string {
    return val;
  }

  @Option({
    flags: '--payload [json]',
    description: 'edit: inline hook payload JSON (default: read from stdin)',
  })
  parsePayload(val: string): string {
    return val;
  }

  @Option({
    flags: '--vendor [name]',
    description: 'edit: force a payload adapter (claude-code | generic); default: auto-detect',
  })
  parseVendor(val: string): string {
    return val;
  }
}
