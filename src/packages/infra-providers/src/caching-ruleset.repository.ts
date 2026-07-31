import { ILogger } from "@beyondnet/evolith-core-domain/domain/interfaces";
import { NormalizedRule } from "@beyondnet/evolith-core-domain/domain/models/normalized-rule";
import { IRulesetRepository } from "@beyondnet/evolith-core-domain/domain/ports/ruleset-repository.port";

/**
 * GT-646 — the ruleset corpus is deployment state, not request state.
 *
 * `DiskRulesetRepository.loadAllRulesets` walks the corpus tree, reads every
 * `*.rules.json`, and runs each one through Ajv. In a one-shot process (the CLI)
 * that cost is paid once and is invisible. In a long-running server it was paid
 * **per request**: `RuleEvaluationEngine.discoverAndEvaluate` calls it on every
 * `POST /api/v1/evaluate`, so a ~176-file / ~107-rule corpus was re-read and
 * re-validated for every evaluation.
 *
 * Because both the directory walk and the Ajv pass are synchronous CPU work
 * inside `await`ed calls, the whole Node event loop stalls while it happens.
 * Measured (CI run 30631939687, Reliability workflow, 1 VU): a `GET /health`
 * that landed during that work took **498.5 ms** end-to-end — `http_req_waiting`
 * 498.4 ms, `http_req_connecting` 0.17 ms — while the handler itself logged
 * `durationMs=0`. The request was not slow; it was queued behind a blocked loop.
 * The same run logged the corpus's load-time WARNs once per k6 iteration, which
 * is what a per-request load looks like from the outside.
 *
 * This decorator makes the corpus what it always was — load-once state — without
 * changing what a load *produces*. It wraps any {@link IRulesetRepository}, so
 * the disk repository stays a pure disk adapter and callers keep depending on
 * the port.
 *
 * Three properties matter, and each is a defect this would otherwise introduce:
 *
 * - **Single-flight.** The in-flight *promise* is memoized, not just the result.
 *   Without this, N concurrent first-requests would each start their own disk
 *   walk — the exact stampede the cache exists to prevent, only now at burst
 *   time instead of steadily.
 * - **Failures are never cached.** A rejected load is evicted, so a corpus fault
 *   that is repaired on disk (or a transient I/O error) does not latch the
 *   process into permanent failure. `RulesetsNotFoundError` stays fatal per
 *   request, exactly as GT-474 requires — it just is not made permanent.
 * - **Callers cannot corrupt the cache.** Each call gets its own array. The rule
 *   objects are shared and treated as immutable by every consumer; the array is
 *   not, because `partitionByApplicability` and the coverage helpers are free to
 *   sort or splice what they are handed.
 *
 * Invalidation is explicit ({@link invalidate}) rather than time-based: the
 * corpus is baked into the image alongside the process, so there is no cadence
 * to guess at, and a TTL would only reintroduce the stall on an unpredictable
 * schedule.
 */
export class CachingRulesetRepository implements IRulesetRepository {
  /** Keyed by `corePath` — one deployment can be asked about more than one Core. */
  private readonly corpora = new Map<string, Promise<NormalizedRule[]>>();

  constructor(
    private readonly inner: IRulesetRepository,
    private readonly logger?: ILogger,
  ) {}

  async loadAllRulesets(corePath: string): Promise<NormalizedRule[]> {
    let load = this.corpora.get(corePath);

    if (!load) {
      load = this.inner.loadAllRulesets(corePath);
      this.corpora.set(corePath, load);

      // Evict on failure BEFORE anyone awaits the result, so a rejected load is
      // never handed to a second caller. `.catch` here also stops the rejection
      // being unhandled in the window before the caller attaches its own
      // handler — the awaited `load` below is what actually propagates it.
      load.catch(() => {
        if (this.corpora.get(corePath) === load) {
          this.corpora.delete(corePath);
        }
      });
    }

    const rules = await load;
    return [...rules];
  }

  /**
   * Warm the cache ahead of the first request. Returns the number of rules
   * loaded so a caller (the boot hook) can log it as the evidence that the
   * corpus was read at startup rather than under traffic.
   */
  async preload(corePath: string): Promise<number> {
    const rules = await this.loadAllRulesets(corePath);
    return rules.length;
  }

  /**
   * Drop the memoized corpus. With no argument, drops every entry.
   *
   * The next load re-reads disk, so this is the supported way to pick up a
   * corpus that changed underneath a running process.
   */
  invalidate(corePath?: string): void {
    if (corePath === undefined) {
      this.corpora.clear();
      this.logger?.debug("Ruleset corpus cache invalidated (all entries)");
      return;
    }
    if (this.corpora.delete(corePath)) {
      this.logger?.debug(`Ruleset corpus cache invalidated: ${corePath}`);
    }
  }

  /** `corePath`s with a loaded (or in-flight) corpus. Diagnostics only. */
  cachedCorePaths(): string[] {
    return [...this.corpora.keys()];
  }
}
