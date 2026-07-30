import * as path from 'path';
import { IFileSystem } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

/**
 * GT-580 — the native half of `src/rulesets/cli/exit-code-taxonomy.rules.json`.
 *
 * The exit code is the only control primitive an agent harness, a pre-commit
 * hook and a CI step have in common, and it only carries meaning while every
 * command draws from one published set: `0` pass, `1` tool failure, `2` blocked,
 * `3` invalid input. A jest scan inside the CLI package already refuses a source
 * that names anything else — but that is a unit test of one package. It cannot
 * be evaluated against a repository, it produces no finding, and it has no Rego
 * parity, so a governance consumer has no way to ask the question at all.
 *
 * This handler is that missing half. `evolith validate` on the Core now
 * evaluates CLI-EXIT-01/02/03 like any other rule, they are `blocking: true`, so
 * a command that exits outside the taxonomy makes the run BLOCK (exit 2) rather
 * than merely failing somebody's unit tests.
 *
 * PARITY. `src/rulesets/opa/cli-exit-code-taxonomy.rego` decides the same three
 * ids from the fact document that `src/sdk/cli/scripts/exit-code-taxonomy-facts.mjs`
 * emits. The scan below is the same scan: same file filter, same literal regex,
 * same taxonomy. Rego receives facts and this handler produces them, which is
 * why the duplication is a boundary rather than a fork — core-domain cannot
 * import a script out of the CLI package without inverting the dependency.
 */
export class CliExitTaxonomyRuleHandler implements INativeRuleHandler {
  /** The published taxonomy. Mirrored from `sdk/cli/src/infrastructure/cli/exit-codes.ts`. */
  private static readonly TAXONOMY: readonly number[] = [0, 1, 2, 3];

  /** `process.exit(N)` / `process.exitCode = N` with a numeric literal. */
  private static readonly EXIT_LITERAL = /process\.exit\(\s*(-?\d+)\s*\)|process\.exitCode\s*=\s*(-?\d+)/g;

  constructor(private readonly fs: IFileSystem) {}

  canHandle(rule: NormalizedRule): boolean {
    return rule.id.startsWith('CLI-EXIT-');
  }

  async evaluate(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    if (rule.id === 'CLI-EXIT-01') return this.evalNoOffenders(rule, ctx);
    if (rule.id === 'CLI-EXIT-02') return this.evalNonVacuousScan(rule, ctx);
    if (rule.id === 'CLI-EXIT-03') return this.evalTaxonomyNotWidened(rule, ctx);

    return { rule, result: 'skipped', message: 'Unhandled CLI-EXIT rule' };
  }

  /** CLI-EXIT-01 — every exit literal in the CLI is a member of the taxonomy. */
  private async evalNoOffenders(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const root = this.cliSourceRoot(ctx);
    if (!(await this.fs.exists(root))) {
      // A missing tree is not compliance. Reported as failed rather than
      // skipped, because `skipped` on a blocking rule is precisely the silent
      // pass this rule exists to prevent.
      return { rule, result: 'failed', message: `CLI source root not found: ${root}` };
    }

    const scan = await this.scan(root);
    if (scan.offenders.length === 0) {
      return { rule, result: 'passed' };
    }

    const named = scan.offenders
      .map((o) => `${o.file}: ${o.snippet}`)
      .join('; ');
    return {
      rule,
      result: 'failed',
      message:
        `${scan.offenders.length} CLI source(s) exit outside the published taxonomy ` +
        `{${CliExitTaxonomyRuleHandler.TAXONOMY.join(', ')}} — ${named}`,
    };
  }

  /** CLI-EXIT-02 — a scan that read nothing found no offenders, which is not compliance. */
  private async evalNonVacuousScan(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const root = this.cliSourceRoot(ctx);
    if (!(await this.fs.exists(root))) {
      return { rule, result: 'failed', message: `CLI source root not found: ${root}` };
    }

    const scan = await this.scan(root);
    if (scan.scanned === 0) {
      return {
        rule,
        result: 'failed',
        message: `the exit-code taxonomy scan covered 0 sources under ${root} — an empty scan is not a pass`,
      };
    }
    return { rule, result: 'passed' };
  }

  /**
   * CLI-EXIT-03 — the taxonomy has not been widened to absorb an offender.
   *
   * Read out of the CLI's own `exit-codes.ts` rather than trusted: the cheap way
   * to silence CLI-EXIT-01 is to add the offending code to `CLI_EXIT_CODES`, and
   * that makes the consumer's problem worse rather than better.
   */
  private async evalTaxonomyNotWidened(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const file = path.join(this.cliSourceRoot(ctx), 'infrastructure', 'cli', 'exit-codes.ts');
    if (!(await this.fs.exists(file))) {
      return { rule, result: 'failed', message: `exit-code taxonomy not declared: ${file} not found` };
    }

    const source = await this.fs.readFile(file);
    const block = /CLI_EXIT_CODES\s*=\s*\{([\s\S]*?)\}\s*as const/.exec(source);
    if (!block) {
      return { rule, result: 'failed', message: `could not read CLI_EXIT_CODES out of ${file}` };
    }

    const declared = [...block[1].matchAll(/:\s*(-?\d+)\s*,/g)]
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b);

    const expected = [...CliExitTaxonomyRuleHandler.TAXONOMY];
    if (declared.length === expected.length && declared.every((v, i) => v === expected[i])) {
      return { rule, result: 'passed' };
    }
    return {
      rule,
      result: 'failed',
      message:
        `the CLI declares exit codes [${declared.join(', ')}]; the published taxonomy is exactly ` +
        `[${expected.join(', ')}] and widening it is a governance decision, not a fix`,
    };
  }

  private cliSourceRoot(ctx: WorkspaceEvaluationContext): string {
    return path.join(ctx.corePath, 'src', 'sdk', 'cli', 'src');
  }

  private async scan(root: string): Promise<{ scanned: number; offenders: Array<{ file: string; code: number; snippet: string }> }> {
    const files = await this.sourceFiles(root);
    const offenders: Array<{ file: string; code: number; snippet: string }> = [];

    for (const file of files) {
      const source = await this.fs.readFile(file);
      // `matchAll` on a `/g` regex consumes it; a fresh instance per file keeps
      // `lastIndex` from carrying between reads.
      const pattern = new RegExp(CliExitTaxonomyRuleHandler.EXIT_LITERAL.source, 'g');
      for (const match of source.matchAll(pattern)) {
        const code = Number(match[1] ?? match[2]);
        if (!CliExitTaxonomyRuleHandler.TAXONOMY.includes(code)) {
          offenders.push({ file: path.relative(root, file), code, snippet: match[0] });
        }
      }
    }

    return { scanned: files.length, offenders };
  }

  /**
   * Every non-test `.ts` source under the CLI.
   *
   * Tests are excluded because they legitimately stub and assert on exit codes
   * outside the taxonomy — including the negative fixtures that prove this very
   * rule can fail.
   */
  private async sourceFiles(dir: string, depth = 0): Promise<string[]> {
    if (depth > 10) return [];
    const out: string[] = [];
    const entries = await this.fs.readdirNames(dir);

    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '__mocks__') continue;
      const full = path.join(dir, entry);
      const stat = await this.fs.stat(full);
      if (stat.isDirectory()) {
        out.push(...(await this.sourceFiles(full, depth + 1)));
        continue;
      }
      if (!entry.endsWith('.ts')) continue;
      if (entry.endsWith('.spec.ts') || entry.endsWith('.test.ts')) continue;
      out.push(full);
    }

    return out;
  }
}
