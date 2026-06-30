/**
 * StubCoreEvaluationAdapter — a DETERMINISTIC {@link ICoreEvaluationPort}. Lets
 * the runtime exercise the full pipeline with no live Core (design rule #5).
 *
 * It is a transparent rule, not a mock: it reads the declared facts in the
 * EvaluationContext passthrough (`missing_artifacts` produced by `.harness`,
 * or an explicit `expectedVerdict`) and returns a well-formed, canonical
 * {@link EvaluationResult}. The PRODUCTION adapter wraps the in-process
 * EvaluationOrchestrator or calls the Core REST API — see
 * `core-evaluation.adapter` notes and the architecture doc.
 */

import type {
  EvaluationContext,
  EvaluationResult,
} from '@evolith/core-domain/evaluation/contracts';
import { Verdict } from '@evolith/core-domain/domain/verdict/verdict';
import type { ICoreEvaluationPort } from '../../domain/ports/core-evaluation.port';

const SCHEMA_VERSION = '1.0.0';

export interface StubCoreOptions {
  /** Reported core version (audit/repro). */
  readonly coreVersion?: string;
  /** Injected clock for deterministic tests. */
  readonly now?: () => string;
}

export class StubCoreEvaluationAdapter implements ICoreEvaluationPort {
  constructor(private readonly options: StubCoreOptions = {}) {}

  async evaluate(context: EvaluationContext): Promise<EvaluationResult> {
    const pass = context.passthrough ?? {};
    const explicit = typeof pass.expectedVerdict === 'string' ? pass.expectedVerdict : undefined;
    const missing = Array.isArray(pass.missing_artifacts)
      ? pass.missing_artifacts.map(String)
      : [];

    const verdict = explicit
      ? this.toVerdict(explicit)
      : missing.length > 0
        ? Verdict.FAIL
        : Verdict.PASS;

    const failed = verdict === Verdict.FAIL;
    const now = this.options.now ? this.options.now() : new Date().toISOString();

    return {
      overallVerdict: verdict,
      outcome: failed ? 'rejected' : verdict === Verdict.PASS ? 'approved' : 'conditional',
      results: {},
      rulesExecuted: [],
      policiesApplied: [],
      gaps: missing.map((artifactId) => ({
        id: `gap:${artifactId}`,
        requirementRef: artifactId,
        severity: 'error' as const,
        message: `Required artifact '${artifactId}' not satisfied.`,
      })),
      risks: [],
      missingEvidence: missing,
      incompleteArtifacts: [],
      recommendations: failed
        ? [
            {
              id: 'rec:unblock',
              kind: 'remediation' as const,
              message: `Provide the missing artifact(s): ${missing.join(', ')}.`,
            },
          ]
        : [],
      requiredActions: missing.map((artifactId) => ({
        id: `action:${artifactId}`,
        description: `Produce '${artifactId}'.`,
        blocking: true,
        remediation: `Author and attach '${artifactId}', then re-run the gate.`,
      })),
      confidence: explicit ? 1 : missing.length > 0 ? 0.9 : 0.95,
      rationale: failed
        ? `Stub Core evaluation: ${missing.length} unmet requirement(s).`
        : 'Stub Core evaluation: all declared requirements satisfied.',
      versions: { core: this.options.coreVersion ?? 'stub-0.1.0' },
      evaluatedAt: now,
      correlationId: context.correlationId,
      schemaVersion: SCHEMA_VERSION,
    };
  }

  private toVerdict(value: string): Verdict {
    const v = value.toUpperCase();
    if (v === 'PASS' || v === 'FAIL' || v === 'WAIVE' || v === 'SKIP') return v as Verdict;
    return Verdict.PASS;
  }
}
