/**
 * Edit-time enforcement orchestration (GT-526 · axis 2).
 *
 * Glues the vendor-neutral {@link normalizeEditIntent normalizer} to the pure core decision
 * (`evaluateEdit`): given a raw agent hook payload and the compiled boundary contract, it decides
 * allow/block and renders a deterministic, human-readable verdict. The command layer is a thin
 * wrapper that reads stdin and maps the verdict to a process exit code.
 */

import {
  evaluateEdit,
  type EditBoundaryRule,
  type EditGateDecision,
} from '@beyondnet/evolith-core-domain/application/validators/enforcement/edit-gate';
import { normalizeEditIntent, type RawHookPayload } from './hook-payload';

/**
 * Claude Code `PreToolUse` blocking exit code. Exit `2` tells the agent runtime to BLOCK the
 * pending tool call and feed stderr back to the model; `0` approves. This is the deterministic,
 * cross-agent contract (any runtime that honors a non-zero "veto" exit works the same way).
 */
export const EDIT_HOOK_BLOCK_EXIT_CODE = 2;
export const EDIT_HOOK_ALLOW_EXIT_CODE = 0;

export interface EditHookResult {
  /** Vendor whose adapter matched, or `null` when the payload was not a gate-able edit. */
  readonly vendor: string | null;
  /** The proposed edit that was evaluated, when one was found. */
  readonly filePath: string | null;
  /** `true` only when an `error`-severity boundary was crossed — the edit must be rejected. */
  readonly blocked: boolean;
  /** The full gate decision (empty when there was nothing to gate). */
  readonly decision: EditGateDecision;
  /** The process exit code the caller should use. */
  readonly exitCode: number;
}

/**
 * Evaluate a raw agent hook payload against the compiled boundary contract.
 *
 * A payload that is not a file-writing intent (a `Read`/`Bash` tool call, an unrecognized shape)
 * is ALLOWED — the gate never blocks what it cannot evaluate; PR/CI (GT-518) stays authoritative.
 */
export function enforceEditPayload(
  raw: RawHookPayload,
  rules: readonly EditBoundaryRule[],
  vendorHint?: string,
): EditHookResult {
  const intent = normalizeEditIntent(raw, vendorHint);
  if (!intent) {
    return {
      vendor: null,
      filePath: null,
      blocked: false,
      decision: { allow: true, violations: [] },
      exitCode: EDIT_HOOK_ALLOW_EXIT_CODE,
    };
  }
  const decision = evaluateEdit(intent.edit, rules);
  const blocked = !decision.allow;
  return {
    vendor: intent.vendor,
    filePath: intent.edit.filePath,
    blocked,
    decision,
    exitCode: blocked ? EDIT_HOOK_BLOCK_EXIT_CODE : EDIT_HOOK_ALLOW_EXIT_CODE,
  };
}

/**
 * Render a deterministic, human-readable verdict for stderr — the text an agent (or a human)
 * sees when the edit is blocked. Includes each crossed boundary with file:line, the ADR ref and
 * the rule message, so the model can self-correct in the same loop.
 */
export function renderEditVerdict(result: EditHookResult): string {
  if (result.vendor === null) {
    return 'edit-gate: no file edit in payload — nothing to enforce (allow).';
  }
  const { decision, filePath } = result;
  if (decision.violations.length === 0) {
    return `edit-gate: ALLOW — ${filePath} conforms to the architecture contract.`;
  }
  const header = result.blocked
    ? `edit-gate: BLOCK — ${filePath} violates the architecture contract:`
    : `edit-gate: ALLOW (with warnings) — ${filePath}:`;
  const lines = decision.violations.map((v) => {
    const adr = v.adrRef ? ` [${v.adrRef}]` : '';
    const tag = v.severity === 'error' ? 'error' : 'warning';
    return `  - ${tag} ${v.ruleId}${adr} at ${v.file}:${v.line} — ${v.message}`;
  });
  return [header, ...lines].join('\n');
}

/** Read all of stdin as a UTF-8 string (the JSON hook payload). Resolves `''` when stdin is empty. */
export function readStdin(stream: NodeJS.ReadableStream = process.stdin): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    stream.setEncoding?.('utf-8');
    stream.on('data', (chunk) => (data += chunk));
    stream.on('end', () => resolve(data));
    stream.on('error', reject);
  });
}
