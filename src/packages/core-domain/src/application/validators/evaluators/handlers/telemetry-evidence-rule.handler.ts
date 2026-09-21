import * as path from 'path';
import { IFileSystem } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

/**
 * GT-716 AC4 — the native twin of `telemetry-evidence.rego` for OBS-EVD-01..03.
 *
 * The policy decides the three rules from the satellite's declared dependencies:
 * a distributed-tracing package, a structured-logging package, a metrics package.
 * Until this handler existed the native engine skipped them as `needs-runtime` /
 * `needs-external-system` — the rules' full intent IS runtime evidence — while the
 * OPA engine decided them from `package.json`, so the same repository got a verdict
 * on one engine and a skip on the other. Both engines now read the same proxy and
 * say the same thing; the proxy's limits are stated in each message.
 *
 * The package lists are the policy's, verbatim. A dependency in `dependencies` or
 * `devDependencies` counts, exactly as `all_deps` in the Rego does.
 */
export class TelemetryEvidenceRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem) {}

  canHandle(rule: NormalizedRule): boolean {
    return rule.id === 'OBS-EVD-01' || rule.id === 'OBS-EVD-02' || rule.id === 'OBS-EVD-03';
  }

  async evaluate(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const deps = await this.allDependencies(ctx.satellitePath);
    const has = (name: string) => deps.has(name);
    const anyOtel = [...deps].some((d) => d.startsWith('@opentelemetry/'));

    if (rule.id === 'OBS-EVD-01') {
      const ok = anyOtel || has('dd-trace') || has('elastic-apm-node');
      return ok
        ? { rule, result: 'passed' }
        : {
            rule,
            result: 'failed',
            message:
              'Production request paths must emit TraceId, SpanId, and CorrelationId. No distributed tracing package ' +
              '(@opentelemetry/*, dd-trace, elastic-apm-node) detected in satellite dependencies.',
          };
    }
    if (rule.id === 'OBS-EVD-02') {
      const ok = has('pino') || has('winston') || has('bunyan') || has('@nestjs/common');
      return ok
        ? { rule, result: 'passed' }
        : {
            rule,
            result: 'failed',
            message:
              'Structured logs must include request correlation fields and avoid raw PII. No structured logging package ' +
              '(pino, winston, bunyan, @nestjs/common) detected in satellite dependencies.',
          };
    }
    const ok = has('prom-client') || anyOtel;
    return ok
      ? { rule, result: 'passed' }
      : {
          rule,
          result: 'failed',
          message:
            'Production services must report error rate, latency percentile, throughput, and availability metrics. ' +
            'No metrics package (prom-client, @opentelemetry/*) detected in satellite dependencies.',
        };
  }

  /** `dependencies` ∪ `devDependencies` of the satellite's root manifest; empty when there is none. */
  private async allDependencies(satellitePath: string): Promise<Set<string>> {
    const manifest = path.join(satellitePath, 'package.json');
    if (!(await this.fs.exists(manifest))) return new Set();
    try {
      const pkg = (await this.fs.readJson(manifest)) as { dependencies?: Record<string, unknown>; devDependencies?: Record<string, unknown> } | null;
      return new Set([...Object.keys(pkg?.dependencies ?? {}), ...Object.keys(pkg?.devDependencies ?? {})]);
    } catch {
      return new Set();
    }
  }
}
