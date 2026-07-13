/**
 * Edit-time enforcement gate (GT-526 · axis 2 — positioning §14.1 surface (b)).
 *
 * The third READ→CONTROL surface, complementing pre-generation (MCP, GT-520) and PR/CI
 * (GT-518): it blocks an offending change IN-FLIGHT, as an AI agent writes, BEFORE the PR.
 * By design it is a FAST, single-file static check — it inspects the edited file's imports
 * against layer-boundary rules WITHOUT a toolchain/restore (that is PR/CI's authoritative
 * job). Catching the most common AI drift (a domain file reaching into infrastructure) at
 * edit time is cheap and cross-agent; the full enforcer run stays the source of truth.
 *
 * It is agent-NEUTRAL: this is a pure decision function. A per-agent hook (a Claude Code
 * PreToolUse hook, a Cursor extension) is a thin adapter that feeds it the {@link ProposedEdit}
 * and enforces the returned {@link EditGateDecision.allow}.
 */

import { makeViolation, type Violation } from '../../../domain/violation';

/** A layer-boundary rule checkable on a single edited file (the edit-time subset). */
export interface EditBoundaryRule {
  readonly ruleId: string;
  readonly adrRef?: string;
  /** Path prefix (posix, trailing `*` allowed) the edited file must match for the rule to apply. */
  readonly appliesTo: string;
  /** Import specifiers forbidden from matching files (exact or prefix match). */
  readonly forbiddenImports: readonly string[];
  readonly severity: 'error' | 'warning';
  readonly message?: string;
}

export interface ProposedEdit {
  readonly filePath: string;
  readonly content: string;
}

export interface EditGateDecision {
  /** `false` when any `error`-severity boundary is crossed — the agent must not apply the edit. */
  readonly allow: boolean;
  /** Canonical violations (tool `edit-gate`), reusable by evidence/compliance (GT-511/GT-525). */
  readonly violations: readonly Violation[];
}

export const EDIT_GATE_TOOL = 'edit-gate';

export interface ImportRef {
  readonly spec: string;
  readonly line: number;
}

const FROM_RE = /\b(?:import|export)\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]/;
const BARE_IMPORT_RE = /\bimport\s*['"]([^'"]+)['"]/;
const REQUIRE_RE = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/;
const USING_RE = /^\s*using\s+(?:static\s+)?([A-Za-z_][\w.]*)\s*;/;

/**
 * Extract import specifiers (with 1-based line numbers) from TS/JS (`import`/`export … from`,
 * bare `import`, `require`) and C# (`using Namespace;`) source. A fast line scan — not a full
 * parser; the authoritative analysis is the PR/CI enforcer run.
 */
export function extractImports(content: string): ImportRef[] {
  const out: ImportRef[] = [];
  const lines = (content || '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = FROM_RE.exec(line) ?? BARE_IMPORT_RE.exec(line) ?? REQUIRE_RE.exec(line) ?? USING_RE.exec(line);
    if (m) out.push({ spec: m[1], line: i + 1 });
  }
  return out;
}

/** Normalize a path and test a prefix pattern (trailing `*` stripped) against it. */
function pathMatches(filePath: string, pattern: string): boolean {
  const f = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  const p = pattern.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\*+$/, '');
  return p === '' || f === p || f.startsWith(p);
}

/**
 * Evaluate a proposed edit against the edit-time boundary rules. Returns canonical
 * {@link Violation}s (one per forbidden import hit) and `allow=false` iff any is
 * `error`-severity. Warnings are reported but do not block.
 */
export function evaluateEdit(edit: ProposedEdit, rules: readonly EditBoundaryRule[]): EditGateDecision {
  const imports = extractImports(edit.content);
  const violations: Violation[] = [];
  for (const rule of rules) {
    if (!pathMatches(edit.filePath, rule.appliesTo)) continue;
    for (const imp of imports) {
      const forbidden = rule.forbiddenImports.find((f) => imp.spec === f || imp.spec.startsWith(f));
      if (!forbidden) continue;
      violations.push(
        makeViolation({
          ruleId: rule.ruleId,
          tool: EDIT_GATE_TOOL,
          file: edit.filePath,
          line: imp.line,
          severity: rule.severity,
          message: rule.message ?? `${rule.ruleId}: ${edit.filePath} must not import '${imp.spec}'`,
          adrRef: rule.adrRef,
        }),
      );
    }
  }
  const allow = !violations.some((v) => v.severity === 'error');
  return { allow, violations };
}
