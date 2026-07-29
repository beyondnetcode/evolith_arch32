/**
 * GT-572 — turn an ABAC refusal into something an operator can act on.
 *
 * A denial used to surface as a bare `FORBIDDEN` carrying only the raw violation
 * ids (`ABAC-02`, `ABAC_POLICY_MISSING`, …). Those ids are meaningful to whoever
 * wrote the evaluator and to nobody else: the caller learns that the call was
 * refused, not why, and never what to change.
 *
 * This module maps violation ids to a remediation sentence appended to the
 * FORBIDDEN message. It is presentation only — it cannot allow anything, it runs
 * strictly after the decision is already `denied`, and it never echoes a
 * credential value.
 */

import { STDIO_CREDENTIAL_ENV, STDIO_CREDENTIAL_FLAG } from './stdio-credential-policy';

/** Shape of a violation as produced by {@link AbacEvaluator}. */
export interface AbacViolationLike {
  id: string;
  message: string;
}

/** Remediation text per violation id, in the order it should be presented. */
const REMEDIATION_BY_ID: Record<string, string> = {
  'ABAC-02':
    'No principal was established for this call, so the request was evaluated as anonymous. '
    + `On stdio in production the server must be started with ${STDIO_CREDENTIAL_ENV} (or ${STDIO_CREDENTIAL_FLAG}) configured — `
    + 'it refuses to start without it, so a running server in this state is one built programmatically without a transport principal. '
    + `On HTTP, send the credential as 'Authorization: Bearer <key>' or the 'x-api-key' header.`,
  'ABAC-03':
    'The tool has no ABAC classification, which fail-closes. Add it to TOOL_CLASSIFICATION in '
    + 'abac-evaluator.ts AND to the matching set in abac-mcp-tool-access.rego (both engines must agree).',
  'ABAC-01':
    'The calling identity holds roles that do not cover this tool class in this environment. '
    + 'Use an identity with a role that does (write → operator/architect; deploy in production → architect), '
    + 'or run the call outside production.',
  ABAC_POLICY_MISSING:
    'The compiled OPA bundle (policy.wasm) is missing at the path named above and production fail-closes without it. '
    + "Build it with 'npm run build:policy' and ship sdk/cli/rulesets/opa/policy.wasm alongside the server "
    + '(the container image copies it into <cwd>/../../sdk/cli/rulesets/opa/). '
    + 'The npm package cannot carry it — policy.wasm is a build artifact outside the package directory — so when the '
    + 'server runs from an npm install, compile the bundle and point at it with EVOLITH_ABAC_POLICY_PATH=/abs/path/to/policy.wasm.',
  OPA_ERROR:
    'The OPA engine itself failed, which fail-closes. Check the error above; a corrupt or '
    + "stale policy.wasm is the usual cause — rebuild it with 'npm run build:policy'.",
};

/**
 * Build the ` What to do: …` suffix for a set of ABAC violations.
 *
 * Returns an empty string when nothing is recognised, so the caller can append
 * unconditionally without producing a dangling label.
 */
export function describeAbacDenial(violations: readonly AbacViolationLike[]): string {
  const seen = new Set<string>();
  const advice: string[] = [];

  for (const violation of violations) {
    const remediation = REMEDIATION_BY_ID[violation?.id];
    if (!remediation || seen.has(violation.id)) continue;
    seen.add(violation.id);
    advice.push(remediation);
  }

  if (advice.length === 0) return '';
  return ` What to do: ${advice.join(' ')}`;
}
