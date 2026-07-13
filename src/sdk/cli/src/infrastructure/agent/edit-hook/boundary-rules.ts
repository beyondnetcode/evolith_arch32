/**
 * Boundary-rules loader for the edit-time gate (GT-526).
 *
 * The edit gate is fed the **compiled architecture contract** as a set of {@link EditBoundaryRule}s
 * — the edit-time subset of the layer boundaries (who may import whom). Those rules are produced
 * upstream by the C4/Structurizr compiler (GT-528, `compileC4ToBoundaryRules` /
 * `parseStructurizrDsl`) or the PolicyCompiler and persisted as JSON. This loader reads that JSON
 * from disk and normalizes the accepted envelopes into a validated `EditBoundaryRule[]`.
 *
 * Accepted top-level shapes (all lower the same rule objects):
 *   - `EditBoundaryRule[]`
 *   - `{ boundaryRules: EditBoundaryRule[] }`
 *   - `{ rules: EditBoundaryRule[] }`
 */

import type { EditBoundaryRule } from '@beyondnet/evolith-core-domain/application/validators/enforcement/edit-gate';

export class BoundaryRulesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BoundaryRulesError';
  }
}

function coerceRule(raw: unknown, index: number): EditBoundaryRule {
  const r = raw as Record<string, unknown>;
  if (!r || typeof r !== 'object') {
    throw new BoundaryRulesError(`boundary rule #${index} is not an object`);
  }
  const ruleId = r.ruleId ?? r.id;
  if (typeof ruleId !== 'string' || ruleId.length === 0) {
    throw new BoundaryRulesError(`boundary rule #${index} is missing a string 'ruleId'`);
  }
  if (typeof r.appliesTo !== 'string' || r.appliesTo.length === 0) {
    throw new BoundaryRulesError(`boundary rule '${ruleId}' is missing a string 'appliesTo'`);
  }
  if (!Array.isArray(r.forbiddenImports) || r.forbiddenImports.some((x) => typeof x !== 'string')) {
    throw new BoundaryRulesError(`boundary rule '${ruleId}' 'forbiddenImports' must be a string[]`);
  }
  const severity = r.severity === 'warning' ? 'warning' : 'error';
  return {
    ruleId,
    adrRef: typeof r.adrRef === 'string' ? r.adrRef : undefined,
    appliesTo: r.appliesTo,
    forbiddenImports: r.forbiddenImports as string[],
    severity,
    message: typeof r.message === 'string' ? r.message : undefined,
  };
}

/** Parse an already-read JSON string into validated boundary rules. */
export function parseBoundaryRules(json: string): EditBoundaryRule[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new BoundaryRulesError(`invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as Record<string, unknown>)?.boundaryRules)
      ? (parsed as { boundaryRules: unknown[] }).boundaryRules
      : Array.isArray((parsed as Record<string, unknown>)?.rules)
        ? (parsed as { rules: unknown[] }).rules
        : undefined;
  if (!list) {
    throw new BoundaryRulesError(
      "expected an EditBoundaryRule[] or an object with a 'boundaryRules'/'rules' array",
    );
  }
  return list.map(coerceRule);
}

/** Read and parse boundary rules from a JSON file path. */
export async function loadBoundaryRules(rulesPath: string): Promise<EditBoundaryRule[]> {
  const fs = await import('fs-extra');
  const raw = await fs.readFile(rulesPath, 'utf-8');
  return parseBoundaryRules(raw);
}
