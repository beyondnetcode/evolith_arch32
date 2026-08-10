/**
 * ShellEnforcerAdapter (GT-514 · EAG-08).
 *
 * A reusable {@link IEnforcerAdapter} that shells a tool out via an
 * {@link IProcessRunner} and delegates output parsing to a per-tool parser. GT-515
 * instantiates it for dependency-cruiser (`depcruise -T json` → violations); other
 * runtimes (Deptrac, NetArchTest, import-linter, Conftest) reuse it with their own
 * `buildSpec`/`parse`. It never spawns a process itself — that is the injected runner.
 */

import type { Violation } from '../../../domain/violation';
import {
  PROCESS_TIMEOUT_EXIT_CODE,
  type EnforcerAnalysisContext,
  type EnforcerRuntime,
  type IEnforcerAdapter,
  type IProcessRunner,
  type ProcessResult,
  type ProcessSpec,
} from './enforcer.types';

/**
 * Default wall clock for ONE enforcer run (GT-664).
 *
 * Chosen to be the same number `DEFAULT_SANDBOX_POLICY.timeoutMs` already
 * declares, and that is the whole argument for it: the host's sandbox policy is
 * the ceiling a deployment sets, so a second, different default at the adapter
 * seam would mean two bounds that disagree — the smaller silently winning and
 * the larger reading as dead text. What this constant adds is not a new number
 * but a bound the DOMAIN owns: before it, the only wall clock lived in the
 * injected runner, so a host that wired an `IProcessRunner` ignoring
 * `spec.timeoutMs` had no bound at all and a hung analyser hung the whole
 * governance run.
 *
 * 120 s is generous on purpose. It is not a latency budget: an analyser that
 * takes 90 s over a large repository is doing its job, and a default tight
 * enough to make a CLI feel fast would SKIP real scans for most tenants — which
 * is the same false assurance as a false pass, arrived at from the other side.
 * A tenant whose analyser needs less, or whose surface has a budget of its own,
 * shortens it per rule with `enforce.config.timeoutMs`.
 */
export const DEFAULT_ENFORCER_TIMEOUT_MS = 120_000;

/**
 * Extra time the adapter's own guard waits beyond the wall clock it handed the
 * runner, before giving up on the runner itself.
 *
 * The runner is the better place to time out — it kills the child process and
 * reports `timedOut`. The guard exists only for the case where that does not
 * happen: a runner that ignores `timeoutMs`, or a child that outlives the signal
 * sent to it. The margin keeps the runner's cleaner path winning under normal
 * jitter instead of racing it.
 */
export const ENFORCER_TIMEOUT_GRACE_MS = 5_000;

/** Per-rule override key read off `enforce.config`. */
const TIMEOUT_CONFIG_KEY = 'timeoutMs';

/**
 * A tool that exceeded its wall clock.
 *
 * Carries `timedOut` (and says "timed out" in its message) so
 * {@link isTimeoutError} classifies it and the `EnforcerEvaluator` records a
 * timeout, not a generic adapter error. It is thrown, never returned, because
 * the evaluator's only two options for a rule are a verdict and a SKIP, and a
 * tool that did not finish has not earned a verdict.
 */
export class EnforcerTimeoutError extends Error {
  readonly timedOut = true;
  constructor(
    readonly tool: string,
    readonly timeoutMs: number,
  ) {
    super(
      `${tool} timed out after ${timeoutMs}ms and was not allowed to report. ` +
        'The rule is SKIPPED: a scan that did not finish says nothing about this ' +
        'repository, and a partial report is not a clean one. Raise or lower the ' +
        'bound with `enforce.config.timeoutMs` on the rule.',
    );
    this.name = 'EnforcerTimeoutError';
  }
}

/**
 * The wall clock for this run: the tenant's per-rule override first, then the
 * adapter's own default, then {@link DEFAULT_ENFORCER_TIMEOUT_MS}.
 *
 * Exported for the tests that pin the precedence. A non-positive or
 * non-finite override is IGNORED rather than honoured: `timeoutMs: 0` would
 * otherwise read as "no time at all", which would SKIP every rule routed to the
 * tool and look, from the report, exactly like an analyser nobody installed.
 */
export function resolveEnforcerTimeoutMs(
  ctx: EnforcerAnalysisContext,
  adapterDefault?: number,
): number {
  for (const rule of ctx.rules) {
    const raw = (rule.enforce?.config as Record<string, unknown> | undefined)?.[TIMEOUT_CONFIG_KEY];
    const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
    if (Number.isFinite(value) && value > 0) return value;
  }
  if (adapterDefault !== undefined && Number.isFinite(adapterDefault) && adapterDefault > 0) {
    return adapterDefault;
  }
  return DEFAULT_ENFORCER_TIMEOUT_MS;
}

export interface ShellEnforcerConfig {
  readonly tool: string;
  readonly runtime: EnforcerRuntime;
  /** Build the process invocation for a given analysis context. */
  buildSpec(ctx: EnforcerAnalysisContext): ProcessSpec;
  /** Map the raw process result into canonical violations. */
  parse(result: ProcessResult, ctx: EnforcerAnalysisContext): Violation[];
  /**
   * Distinguish a genuine tool FAILURE (missing binary, bad config, crash) from a clean
   * run that simply found no violations. Report-emitting tools (`depcruise -T json`, a
   * SARIF analyzer) always write their report on success, so an empty stdout means the
   * tool never ran to completion. When this returns `true`, {@link ShellEnforcerAdapter.analyze}
   * THROWS so the {@link EnforcerEvaluator} SKIPS the rule — a crashed tool must never be
   * mistaken for "0 violations → passed" (a false pass). Override per-tool when a tool can
   * legitimately emit empty output on success. Default: empty stdout ⇒ failure.
   */
  isToolFailure?(result: ProcessResult, ctx: EnforcerAnalysisContext): boolean;
  /**
   * A reason this adapter CANNOT certify the rules routed to it in `ctx`, checked
   * BEFORE the process runs; `undefined` means it can.
   *
   * GT-632 — the false-pass counterpart of {@link isToolFailure}. `isToolFailure`
   * catches a tool that did not run. This catches a tool that ran perfectly and
   * answered a DIFFERENT question: dependency-cruiser invoked without the config
   * compiled from these rules evaluates whatever config the satellite happens to
   * ship, reports violations under ITS rule names, none of which match the routed
   * `toolRuleId` — so {@link EnforcerEvaluator} sees zero matches and marks four
   * blocking rules `passed`. Silence from a tool that was never asked the question
   * is not evidence.
   */
  certificationGap?(ctx: EnforcerAnalysisContext): string | undefined;
  /**
   * This tool's default wall clock, in ms, when no rule names one. Absent ⇒
   * {@link DEFAULT_ENFORCER_TIMEOUT_MS}. A rule's `enforce.config.timeoutMs`
   * always wins over it.
   */
  readonly timeoutMs?: number;
}

export class ShellEnforcerAdapter implements IEnforcerAdapter {
  constructor(
    private readonly config: ShellEnforcerConfig,
    private readonly runner: IProcessRunner,
  ) {}

  get tool(): string {
    return this.config.tool;
  }

  get runtime(): EnforcerRuntime {
    return this.config.runtime;
  }

  async analyze(ctx: EnforcerAnalysisContext): Promise<Violation[]> {
    const gap = this.config.certificationGap?.(ctx);
    if (gap) {
      // Throw before spawning anything: the EnforcerEvaluator records a SKIP,
      // which CompositeRuleEvaluator then degrades to the native engine. Running
      // the tool anyway would produce a confident, meaningless green.
      throw new Error(`${this.config.tool} cannot certify these rules: ${gap}`);
    }
    const timeoutMs = resolveEnforcerTimeoutMs(ctx, this.config.timeoutMs);
    const built = this.config.buildSpec(ctx);
    // The wall clock travels WITH the spec so the runner can kill the child and
    // report `timedOut`. A `timeoutMs` a buildSpec set for its own reasons is
    // left alone unless a rule overrode it — the rule is the tenant speaking.
    const spec: ProcessSpec = { ...built, timeoutMs: built.timeoutMs ?? timeoutMs };
    const result = await this.runWithWallClock(spec, timeoutMs);

    // GT-664 — checked BEFORE `isToolFailure`, and not delegated to it. A tool
    // killed mid-scan can leave stdout that still parses: ESLint's `--format
    // json` truncated at a file boundary is a shorter valid array, and every
    // `isToolFailure` in this package answers "is this a report?" — to which a
    // partial report says yes. The run would then be parsed as a complete one
    // and its missing findings read as a clean repository. Timing out is a SKIP.
    if (result.timedOut === true || result.exitCode === PROCESS_TIMEOUT_EXIT_CODE) {
      throw new EnforcerTimeoutError(this.config.tool, timeoutMs);
    }

    const failed = this.config.isToolFailure
      ? this.config.isToolFailure(result, ctx)
      : result.stdout.trim() === '';
    if (failed) {
      // Throw (not `return []`) so the EnforcerEvaluator records a SKIP rather than a
      // false pass: a tool that produced no parseable report never certified anything.
      throw new Error(
        `${this.config.tool} produced no parseable report (exit ${result.exitCode})` +
          `${result.stderr ? `: ${result.stderr.trim().slice(0, 200)}` : ''}`,
      );
    }
    return this.config.parse(result, ctx);
  }

  /**
   * Run the spec, but never wait on the runner forever.
   *
   * `IProcessRunner` is a PORT: `spec.timeoutMs` is a request, and the domain
   * cannot verify that whatever a host injected honours it. Before this, the
   * only wall clock was the infra runner's, so an adapter that ignored the field
   * — or a child that survived the signal sent to it — left `analyze` pending
   * and the whole validation with it. This bounds the wait on THIS side of the
   * port; the runner's own timeout still does the useful part (killing the
   * child), which is why the guard waits {@link ENFORCER_TIMEOUT_GRACE_MS}
   * longer and only wins when the runner did not.
   */
  private async runWithWallClock(spec: ProcessSpec, timeoutMs: number): Promise<ProcessResult> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.runner.run(spec),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new EnforcerTimeoutError(this.config.tool, timeoutMs)),
            timeoutMs + ENFORCER_TIMEOUT_GRACE_MS,
          );
          // The guard must never be the reason a process stays alive: if
          // everything else has finished, a pending governance timer keeping a
          // CLI open would be a hang of our own making.
          timer.unref?.();
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
