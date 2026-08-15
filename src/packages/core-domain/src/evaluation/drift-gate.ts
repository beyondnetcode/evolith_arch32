/**
 * PR/CI drift gate (GT-518 · EAG-13).
 *
 * Turns an {@link EvaluationResult} into a DETERMINISTIC merge decision: block when a
 * non-waived ADR/rule violation of `error` severity remains, and cite the ADR id + the
 * accountable owner (resolved from CODEOWNERS / IDP ownership). The blocking path never
 * silently no-ops — it always yields a PR-comment body AND a non-zero exit code.
 *
 * The live GitHub/GitLab Checks API publish (a GitHub App with `checks:write` + GHAS on
 * private repos) is DEPLOY-GATED: it sits behind {@link IChecksPublisher}, and the
 * dependency-free {@link PrCommentFallbackPublisher} is the fallback the gap mandates.
 *
 * Composition, not new mechanism:
 *  - findings → canonical {@link Violation}s via {@link evaluationResultToViolations};
 *  - owner via {@link enrichViolationsWithCodeowners} / {@link enrichViolationsWithOwner};
 *  - waivers via {@link applyWaivers} (suppressed findings are marked `frozen`, with an audit trail);
 *  - evidence via {@link buildEnforcerEvidence} (EVD-01..03 carried, waived findings do not block).
 *
 * Pure: no clock (caller passes `now`), no `fs`, no network.
 */

import type { EvaluationResult } from './contracts/evaluation-result';
import { evaluationResultToViolations } from './sarif-exporter';
import {
  buildEnforcerEvidence,
  type EnforcerEvidenceManifest,
  type Violation,
} from '../domain/violation';
import { enrichViolationsWithCompliance } from '../domain/compliance';
import { enrichViolationsWithCodeowners, type CodeownersRule } from '../domain/codeowners';
import { enrichViolationsWithOwner, type OwnershipEntry } from '../domain/ownership';
import { freezeWaivedViolations, type IWaiverStore } from '../domain/waiver';

/** Exit code CI honors when the gate blocks a merge (mirrors the enforce edit-gate convention). */
export const DRIFT_GATE_BLOCK_EXIT_CODE = 1;
/** Exit code when the gate passes. */
export const DRIFT_GATE_PASS_EXIT_CODE = 0;
/** Default `tool`/source stamped on the derived violations + evidence manifest. */
export const DRIFT_GATE_SOURCE = 'drift-gate';

/** A single blocking violation, resolved to the ADR it traces to and the accountable owner. */
export interface DriftCitation {
  /** ADR id when the violation traces to one (e.g. `ADR-0002`), else the rule id. */
  readonly ref: string;
  /** True when {@link DriftCitation.ref} is an ADR id (drives the "ADR violated" message). */
  readonly isAdr: boolean;
  /** Rule that was violated. */
  readonly ruleId: string;
  /** Accountable owner (CODEOWNERS / IDP), when resolved. */
  readonly owner?: string;
  /** Offending file (repo-relative), `''` for a project-level finding. */
  readonly file: string;
  readonly message: string;
  readonly fingerprint: string;
  /** Compliance controls this violation discharges (GT-525), when enriched. */
  readonly complianceControls?: readonly string[];
}

/** A finding suppressed by an active waiver — surfaced in the PR comment for transparency. */
export interface DriftWaivedFinding {
  readonly fingerprint: string;
  readonly ruleId: string;
  readonly waiverRef: string;
  readonly waiverVersion: number;
  readonly expiresAt: string;
}

export interface DriftGateDecision {
  /** Whether the merge is blocked (any retained `error` violation). */
  readonly blocked: boolean;
  /** Process exit code — non-zero on block, so CI gates even without the Checks API. */
  readonly exitCode: number;
  /** ADR/rule citations for every blocking violation. */
  readonly citations: readonly DriftCitation[];
  /** Findings suppressed by an active waiver (audit trail). */
  readonly waived: readonly DriftWaivedFinding[];
  /** waiverRefs active at `now` that matched NO finding in this run (stale/typo'd fingerprint). */
  readonly unmatchedWaivers: readonly string[];
  /** Markdown PR-comment body — the deploy-gate-free fallback for the Checks API. */
  readonly prCommentBody: string;
  /** Auditable evidence manifest (EVD-01..03); waived findings are `frozen` so they do not block. */
  readonly evidence: EnforcerEvidenceManifest;
}

export interface DriftGateInput {
  readonly result: EvaluationResult;
  /** Parsed CODEOWNERS rules (from `.github/CODEOWNERS`), for owner enrichment. */
  readonly codeowners?: readonly CodeownersRule[];
  /** IDP ownership entries (Backstage/Port/Cortex), applied after CODEOWNERS as a fallback. */
  readonly ownership?: readonly OwnershipEntry[];
  /** Waiver store; findings with an active approved+unexpired waiver are suppressed. */
  readonly waivers?: IWaiverStore;
  /** Evaluation instant for waiver expiry (ISO-8601 UTC). Defaults to `result.evaluatedAt`. */
  readonly now?: string;
  /** Source/tool label for the derived violations + evidence. Defaults to `drift-gate`. */
  readonly source?: string;
}

function toCitation(v: Violation): DriftCitation {
  const isAdr = /^ADR-/i.test(v.adrRef ?? '');
  return {
    ref: v.adrRef ?? v.ruleId,
    isAdr,
    ruleId: v.ruleId,
    owner: v.owner,
    file: v.file,
    message: v.message,
    fingerprint: v.fingerprint,
    ...(v.complianceControls && v.complianceControls.length > 0
      ? { complianceControls: v.complianceControls }
      : {}),
  };
}

/** Render one blocking violation as a line citing the ADR/rule + owner. */
function renderCitationLine(c: DriftCitation): string {
  const subject = c.isAdr ? `**${c.ref}** violated` : `rule **${c.ref}** violated`;
  const owner = c.owner ? ` — owner ${c.owner}` : ' — owner: unassigned (add a CODEOWNERS entry)';
  const where = c.file ? ` \`${c.file}\`` : '';
  // The fingerprint is the ONLY key `evolith waiver request --fingerprint` accepts, and no
  // other surface a human reads printed it. Without it the waiver flow is unusable by hand.
  return `- ${subject}${owner}:${where} ${c.message} [fp \`${c.fingerprint}\`]`;
}

function renderPrComment(decision: {
  blocked: boolean;
  citations: readonly DriftCitation[];
  waived: readonly DriftWaivedFinding[];
  unmatchedWaivers: readonly string[];
}): string {
  const lines: string[] = ['## Evolith architecture drift gate'];
  if (!decision.blocked) {
    lines.push('', ':white_check_mark: No blocking architecture violations. Safe to merge.');
  } else {
    const n = decision.citations.length;
    lines.push('', `:no_entry: **Blocked** — ${n} blocking architecture violation${n === 1 ? '' : 's'}:`, '');
    for (const c of decision.citations) lines.push(renderCitationLine(c));
    lines.push(
      '',
      'Resolve the violation, or waive it by the `fp` above:',
      '`evolith waiver request --ref W-1 --fingerprint <fp> --reason "…" --by <you> --expires <iso>`, ' +
        'then `evolith waiver approve --ref W-1 --by <owner>`.',
    );
  }
  if (decision.waived.length > 0) {
    lines.push('', '<details><summary>Waived findings (suppressed until expiry)</summary>', '');
    for (const w of decision.waived) {
      lines.push(`- ${w.ruleId} — waiver \`${w.waiverRef}\`@v${w.waiverVersion}, expires ${w.expiresAt}`);
    }
    lines.push('', '</details>');
  }
  if (decision.unmatchedWaivers.length > 0) {
    lines.push(
      '',
      `:warning: ${decision.unmatchedWaivers.length} approved waiver(s) matched no finding in this run ` +
        `(stale or mistyped fingerprint): ${decision.unmatchedWaivers.join(', ')}.`,
    );
  }
  return lines.join('\n');
}

/**
 * Evaluate the drift gate over an {@link EvaluationResult}. Deterministic and pure.
 *
 * A merge is BLOCKED when, after suppressing waived findings, any `error`-severity violation
 * remains. Warnings never block. Every blocking violation is cited with its ADR id (or rule id)
 * and resolved owner; the same set drives the PR-comment fallback and the non-zero exit code.
 */
export function evaluateDriftGate(input: DriftGateInput): DriftGateDecision {
  const source = input.source ?? DRIFT_GATE_SOURCE;
  const now = input.now ?? input.result.evaluatedAt;

  // 1. Findings → canonical violations, enriched with owner (CODEOWNERS first, IDP fallback)
  //    and compliance controls (GT-525).
  let violations = evaluationResultToViolations(input.result, source);
  if (input.codeowners && input.codeowners.length > 0) {
    violations = enrichViolationsWithCodeowners(violations, input.codeowners);
  }
  if (input.ownership && input.ownership.length > 0) {
    violations = enrichViolationsWithOwner(violations, input.ownership);
  }
  violations = enrichViolationsWithCompliance(violations);

  // 2. Suppress waived findings, keeping the audit trail. A suppressed violation is marked
  //    `frozen` so the evidence manifest counts it as non-blocking (GT-517 semantics).
  const waived: DriftWaivedFinding[] = [];
  const unmatchedWaivers: string[] = [];
  // GT-677: `freezeWaivedViolations` returns a readonly view, so the local must admit one.
  let evidenceViolations: readonly Violation[] = violations;
  if (input.waivers) {
    const frozen = freezeWaivedViolations(violations, input.waivers, now);
    evidenceViolations = frozen.violations;
    for (const s of frozen.suppressed) {
      waived.push({
        fingerprint: s.violation.fingerprint,
        ruleId: s.violation.ruleId,
        waiverRef: s.waiver.waiverRef,
        waiverVersion: s.waiver.version,
        expiresAt: s.waiver.expiresAt,
      });
    }
    unmatchedWaivers.push(...frozen.unmatched);
  }

  // 3. Blocking = retained (non-frozen) `error` violations.
  const blocking = evidenceViolations.filter((v) => v.severity === 'error' && !v.frozen);
  const citations = blocking.map(toCitation);
  const blocked = blocking.length > 0;

  // 4. Evidence manifest (EVD-01..03). A single waiverRef is stamped when one waiver applied.
  const evidence = buildEnforcerEvidence({
    id: `drift-gate:${input.result.correlationId ?? input.result.evaluatedAt}`,
    source,
    sourceRef:
      input.result.correlationId ??
      (input.result.versions?.core ? `core@${input.result.versions.core}` : `run@${input.result.evaluatedAt}`),
    generatedAt: input.result.evaluatedAt,
    producer: source,
    violations: evidenceViolations,
    evaluatedRules: [...new Set(input.result.rulesExecuted.map((r) => r.ruleId))].sort(),
    waiverRef: waived.length === 1 ? waived[0].waiverRef : undefined,
  });

  const prCommentBody = renderPrComment({ blocked, citations, waived, unmatchedWaivers });

  return {
    blocked,
    exitCode: blocked ? DRIFT_GATE_BLOCK_EXIT_CODE : DRIFT_GATE_PASS_EXIT_CODE,
    citations,
    waived,
    unmatchedWaivers,
    prCommentBody,
    evidence,
  };
}

// ---------------------------------------------------------------------------
// Publish seam — the live Checks API is DEPLOY-GATED behind this interface.
// ---------------------------------------------------------------------------

/** Where a decision was published (a Checks API run url, or the local fallback). */
export interface ChecksPublishResult {
  /** `github-checks` for the live API, `pr-comment-fallback` for the deploy-gate-free path. */
  readonly channel: string;
  /** The check-run conclusion CI reads (`success` | `failure`). */
  readonly conclusion: 'success' | 'failure';
  /** The comment/summary body that was (or would be) posted. */
  readonly body: string;
  /** Exit code the caller should propagate. */
  readonly exitCode: number;
  /** Live check-run url when published to the Checks API; absent for the fallback. */
  readonly url?: string;
}

/**
 * Publish seam for the drift decision. The LIVE GitHub/GitLab Checks API implementation
 * (`checks:write` GitHub App) is DEPLOY-GATED and lives in an infra adapter, NOT here.
 */
export interface IChecksPublisher {
  publish(decision: DriftGateDecision): Promise<ChecksPublishResult>;
}

/**
 * The fallback the gap mandates when no GitHub App / GHAS is available: surface the PR-comment
 * body and a non-zero exit code on block. Never a silent no-op — a blocked decision ALWAYS
 * yields `conclusion: 'failure'` and a non-zero `exitCode`. Dependency-free (no network).
 */
export class PrCommentFallbackPublisher implements IChecksPublisher {
  async publish(decision: DriftGateDecision): Promise<ChecksPublishResult> {
    return {
      channel: 'pr-comment-fallback',
      conclusion: decision.blocked ? 'failure' : 'success',
      body: decision.prCommentBody,
      exitCode: decision.exitCode,
    };
  }
}
