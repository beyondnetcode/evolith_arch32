/**
 * Pure result assembly: fold the outputs of `.harness`, the Core Evaluation
 * Engine and OPA into one canonical {@link AgentRuntimeResult}. Side-effect free
 * and exported on its own so the status/finding mapping is unit-testable in
 * isolation (one of the required test cases).
 */

import type { EvaluationResult } from '@beyondnet/evolith-core-domain/evaluation/contracts';
import type {
  AgentRuntimeResult,
  RuntimeFinding,
  RuntimeRecommendation,
  RuntimeStatus,
} from '../domain/contracts/agent-runtime-result';
import type { HarnessExecutionResult } from '../domain/ports/harness.port';
import type { PolicyValidationResult } from '../domain/ports/policy-validation.port';

/** Map a canonical Verdict string to a runtime status (policy can still override). */
export function verdictToStatus(verdict: string): RuntimeStatus {
  switch (verdict) {
    case 'PASS':
      return 'passed';
    case 'FAIL':
      return 'blocked';
    case 'WAIVE':
    case 'SKIP':
      return 'warning';
    default:
      return 'warning';
  }
}

/** Precedence: error > blocked > warning > passed. */
export function mergeStatus(a: RuntimeStatus, b: RuntimeStatus): RuntimeStatus {
  const rank: Record<RuntimeStatus, number> = { error: 3, blocked: 2, warning: 1, passed: 0 };
  return rank[a] >= rank[b] ? a : b;
}

function riskLevelToSeverity(level: string): RuntimeFinding['severity'] {
  if (level === 'critical' || level === 'high') return 'error';
  if (level === 'medium') return 'warning';
  return 'info';
}

/** Extract runtime findings/recommendations/missing-artifacts from a Core result. */
export function fromEvaluation(result: EvaluationResult): {
  status: RuntimeStatus;
  findings: RuntimeFinding[];
  recommendations: RuntimeRecommendation[];
  missingArtifacts: string[];
} {
  const findings: RuntimeFinding[] = [
    ...result.gaps.map((g) => ({
      id: g.id,
      severity: g.severity,
      message: g.message,
      source: 'core',
      ruleRef: g.requirementRef,
      location: g.location,
    })),
    ...result.risks.map((r) => ({
      id: r.id,
      severity: riskLevelToSeverity(r.level),
      message: r.message,
      source: 'core',
      ruleRef: r.ruleRef,
      location: r.location,
    })),
  ];

  const recommendations: RuntimeRecommendation[] = result.recommendations.map((r) => ({
    id: r.id,
    message: r.message,
    rationale: r.rationale,
    references: r.references,
  }));

  const missingArtifacts = [...result.missingEvidence, ...result.incompleteArtifacts];

  return {
    status: verdictToStatus(String(result.overallVerdict)),
    findings,
    recommendations,
    missingArtifacts,
  };
}

/**
 * Extract runtime fields from a raw harness result. Validators emit JSON on
 * stdout; we read a conventional shape: `{ status?, findings?|errors?,
 * missing_artifacts?|missingArtifacts?, recommendations? }`. Anything missing
 * falls back to the process exit signal.
 */
export function fromHarness(result: HarnessExecutionResult): {
  status: RuntimeStatus;
  findings: RuntimeFinding[];
  recommendations: RuntimeRecommendation[];
  missingArtifacts: string[];
} {
  const data = (result.data ?? {}) as Record<string, unknown>;

  const declaredStatus = typeof data.status === 'string' ? data.status : undefined;
  const status: RuntimeStatus =
    declaredStatus && ['passed', 'blocked', 'warning', 'error'].includes(declaredStatus)
      ? (declaredStatus as RuntimeStatus)
      : result.ok
        ? 'passed'
        : 'blocked';

  const rawFindings = (Array.isArray(data.findings) ? data.findings : data.errors) ?? [];
  const findings: RuntimeFinding[] = (Array.isArray(rawFindings) ? rawFindings : []).map(
    (f, i) => {
      if (typeof f === 'string') {
        return { id: `harness-${i}`, severity: 'error' as const, message: f, source: 'harness' };
      }
      const o = (f ?? {}) as Record<string, unknown>;
      return {
        id: String(o.id ?? `harness-${i}`),
        severity: (o.severity as RuntimeFinding['severity']) ?? 'error',
        message: String(o.message ?? o.msg ?? JSON.stringify(o)),
        source: 'harness',
        ruleRef: o.ruleRef ? String(o.ruleRef) : undefined,
        location: o.location ? String(o.location) : undefined,
      };
    },
  );

  const missingRaw = data.missing_artifacts ?? data.missingArtifacts ?? [];
  const missingArtifacts = (Array.isArray(missingRaw) ? missingRaw : []).map((m) => String(m));

  const recRaw = data.recommendations ?? [];
  const recommendations: RuntimeRecommendation[] = (Array.isArray(recRaw) ? recRaw : []).map(
    (r, i) =>
      typeof r === 'string'
        ? { id: `rec-${i}`, message: r }
        : {
            id: String((r as Record<string, unknown>).id ?? `rec-${i}`),
            message: String((r as Record<string, unknown>).message ?? r),
          },
  );

  return { status, findings, recommendations, missingArtifacts };
}

/** Fold OPA violations into findings and force `blocked` when not allowed. */
export function applyPolicy(
  base: {
    status: RuntimeStatus;
    findings: RuntimeFinding[];
    recommendations: RuntimeRecommendation[];
    missingArtifacts: string[];
  },
  policy: PolicyValidationResult,
): typeof base {
  const findings: RuntimeFinding[] = [
    ...base.findings,
    ...policy.violations.map((v) => ({
      id: v.ruleId,
      severity: v.severity,
      message: v.message,
      source: 'opa',
      ruleRef: policy.policyRef,
    })),
  ];
  return {
    ...base,
    findings,
    status: policy.allowed ? base.status : mergeStatus(base.status, 'blocked'),
  };
}

export interface AssembleArgs {
  readonly parts: {
    status: RuntimeStatus;
    findings: RuntimeFinding[];
    recommendations: RuntimeRecommendation[];
    missingArtifacts: string[];
  };
  readonly trace: AgentRuntimeResult['trace'];
  readonly evaluatedAt: string;
  readonly summary?: string;
  readonly raw?: Readonly<Record<string, unknown>>;
}

/** Final fold into the canonical result, deriving a human summary if absent. */
export function assembleResult(args: AssembleArgs): AgentRuntimeResult {
  const { parts } = args;
  const summary =
    args.summary ??
    defaultSummary(parts.status, parts.findings.length, parts.missingArtifacts.length);
  return {
    status: parts.status,
    summary,
    findings: parts.findings,
    missingArtifacts: parts.missingArtifacts,
    recommendations: parts.recommendations,
    trace: args.trace,
    evaluatedAt: args.evaluatedAt,
    raw: args.raw,
  };
}

function defaultSummary(status: RuntimeStatus, findings: number, missing: number): string {
  switch (status) {
    case 'passed':
      return 'Capability executed and validated; no blocking findings.';
    case 'blocked':
      return `Execution blocked: ${findings} finding(s), ${missing} missing artifact(s).`;
    case 'warning':
      return `Executed with ${findings} non-blocking finding(s).`;
    case 'error':
      return 'Runtime error: capability could not be executed.';
  }
}
