/**
 * GT-146 — Versioned, fail-closed validation of the agentic review result.
 *
 * Replaces the fragile free-text `VIOLATION_DETECTED` marker with a structured,
 * versioned contract. A malformed, unsupported, or indeterminate provider
 * response can never silently pass the gate: it resolves to `verdict: "error"`
 * with `passesGate: false`.
 *
 * Expected provider response (schema v1.0):
 *   {
 *     "schemaVersion": "1.0",
 *     "verdict": "pass" | "fail",
 *     "findings": [
 *       { "ruleId"?: string, "severity": "error"|"warning"|"info",
 *         "title": string, "file": string, "line"?: integer, "confidence": 0..1 }
 *     ]
 *   }
 */

export const REVIEW_SCHEMA_VERSION = '1.0';
const SEVERITIES = new Set(['error', 'warning', 'info']);

/** Extract and parse the JSON object from a provider response (tolerates fences/prose). */
export function parseProviderResponse(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { ok: false, error: 'empty provider response' };

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = (fence ? fence[1] : text).trim();
  if (!candidate.startsWith('{')) {
    const i = candidate.indexOf('{');
    const j = candidate.lastIndexOf('}');
    if (i >= 0 && j > i) candidate = candidate.slice(i, j + 1);
  }
  try {
    return { ok: true, value: JSON.parse(candidate) };
  } catch (e) {
    return { ok: false, error: `unparseable provider response: ${e.message}` };
  }
}

/** Validate a parsed result against schema v1.0. Returns a fail-closed verdict. */
export function validateReviewResult(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, verdict: 'error', errors: ['result is not an object'] };
  }
  const errors = [];
  if (obj.schemaVersion !== REVIEW_SCHEMA_VERSION) {
    errors.push(`unsupported schemaVersion: ${JSON.stringify(obj.schemaVersion)}`);
  }
  if (obj.verdict !== 'pass' && obj.verdict !== 'fail') {
    errors.push(`invalid verdict: ${JSON.stringify(obj.verdict)}`);
  }
  if (!Array.isArray(obj.findings)) {
    errors.push('findings must be an array');
  } else {
    obj.findings.forEach((f, i) => {
      if (!f || typeof f !== 'object') {
        errors.push(`finding[${i}] is not an object`);
        return;
      }
      if (!SEVERITIES.has(f.severity)) errors.push(`finding[${i}].severity invalid: ${JSON.stringify(f.severity)}`);
      if (typeof f.title !== 'string' || !f.title.trim()) errors.push(`finding[${i}].title is required`);
      if (typeof f.file !== 'string' || !f.file.trim()) errors.push(`finding[${i}].file (evidence location) is required`);
      if (typeof f.confidence !== 'number' || Number.isNaN(f.confidence) || f.confidence < 0 || f.confidence > 1) {
        errors.push(`finding[${i}].confidence must be a number in [0,1]`);
      }
      if (f.line !== undefined && (!Number.isInteger(f.line) || f.line < 0)) {
        errors.push(`finding[${i}].line must be a non-negative integer`);
      }
    });
  }
  if (errors.length) return { ok: false, verdict: 'error', errors };
  return { ok: true, verdict: obj.verdict, findings: obj.findings, schemaVersion: obj.schemaVersion };
}

/**
 * Parse + validate + decide the gate, fail-closed.
 * `passesGate` is true ONLY for a well-formed `verdict: "pass"`.
 */
export function evaluateProviderResponse(raw) {
  const parsed = parseProviderResponse(raw);
  if (!parsed.ok) {
    return { ok: false, verdict: 'error', errors: [parsed.error], findings: [], passesGate: false };
  }
  const result = validateReviewResult(parsed.value);
  return { ...result, findings: result.findings ?? [], passesGate: result.ok === true && result.verdict === 'pass' };
}
