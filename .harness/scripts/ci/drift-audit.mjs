/**
 * GT-147 — Operational capability & efficiency drift evaluator (reusable).
 *
 * Pure source analysis that asserts the kinds of drift the Winston V4 review
 * found by hand: success reported next to unimplemented/commented external
 * operations ("false success"), and external-service calls with no budget,
 * redaction, timeout, retry, or fail-closed controls. Emits versioned,
 * machine-readable findings with source locations so regressions are caught
 * automatically instead of by inspection.
 */

export const AUDIT_SCHEMA_VERSION = '1.0';

const SUCCESS_CLAIM = /console\.\w+\([^)]*?(upsert|✅|passed|success|synchroniz|indexed|complete|done)/i;
const COMMENTED_EXTERNAL = /\/\/\s*(TODO|FIXME|await\b|.*\.(upsert|embed|query|request|fetch)\s*\(|.*vector\s*store|.*replace with)/i;
const EXTERNAL_CALL = /\b(https?\.request\s*\(|fetch\s*\(|generateContent|:generateContent|\.upsert\s*\(|\.embed\s*\(|openai|anthropic|gemini)/i;
const CONTROL_MARKER = /(maxTokens|maxBytes|max_tokens|budget|redact|timeout|retry|backoff|fail.?closed|failClosed|durable|MAX_REVIEW|chunk)/i;

/** Analyze one source file. Returns an array of findings. */
export function auditSource(source, file = '<source>') {
  const findings = [];
  const text = String(source ?? '');
  const lines = text.split('\n');

  // Rule 1 — false success: a success claim within ±3 lines of a commented-out
  // external operation or a TODO/FIXME marker.
  lines.forEach((line, i) => {
    if (!SUCCESS_CLAIM.test(line)) return;
    const window = lines.slice(Math.max(0, i - 3), i + 4).join('\n');
    if (COMMENTED_EXTERNAL.test(window)) {
      findings.push({
        ruleId: 'DRIFT-FALSE-SUCCESS',
        severity: 'error',
        title: 'Success reported next to an unimplemented or commented-out external operation',
        file,
        line: i + 1,
        evidence: line.trim().slice(0, 140),
      });
    }
  });

  // Rule 2 — unbounded external capability: a call to an external service with
  // no budget/redaction/timeout/retry/fail-closed control anywhere in the file.
  if (EXTERNAL_CALL.test(text) && !CONTROL_MARKER.test(text)) {
    const idx = lines.findIndex((l) => EXTERNAL_CALL.test(l));
    findings.push({
      ruleId: 'DRIFT-UNBOUNDED-CALL',
      severity: 'error',
      title: 'External-service call without budget, redaction, timeout, retry, or fail-closed controls',
      file,
      line: idx >= 0 ? idx + 1 : undefined,
      evidence: idx >= 0 ? lines[idx].trim().slice(0, 140) : 'external call detected; no control markers found',
    });
  }

  return findings;
}

/** Audit a set of `{ file, source }` records. Returns a versioned report. */
export function auditSources(records) {
  const findings = [];
  for (const r of records) findings.push(...auditSource(r.source, r.file));
  return {
    schemaVersion: AUDIT_SCHEMA_VERSION,
    scanned: records.length,
    findings,
    counts: {
      error: findings.filter((f) => f.severity === 'error').length,
      warning: findings.filter((f) => f.severity === 'warning').length,
    },
  };
}

/**
 * Audit one accepted topology for artifact parity and orphaned references.
 * Draft topologies are skipped. `exists(relPath)` reports repo-root-relative
 * existence so the function stays pure and testable.
 */
export function auditTopology(manifest, exists, dir) {
  const findings = [];
  const id = manifest?.metadata?.id;
  const status = manifest?.metadata?.status;
  if (!id || status !== 'accepted') return findings;

  const required = [
    { rel: `${dir}/${id}.rules.json`, what: 'Native ruleset' },
    { rel: `${dir}/${id}.rego`, what: 'OPA policy' },
    { rel: `${dir}/README.md`, what: 'README' },
    { rel: `${dir}/README.es.md`, what: 'bilingual README' },
  ];
  for (const r of required) {
    if (!exists(r.rel)) {
      findings.push({
        ruleId: 'TOPO-MISSING-ARTIFACT',
        severity: 'error',
        title: `Accepted topology "${id}" is missing its ${r.what}`,
        file: r.rel,
      });
    }
  }

  for (const ref of manifest?.spec?.artifacts?.adrs || []) {
    if (!exists(ref)) {
      findings.push({
        ruleId: 'TOPO-ORPHAN-REF',
        severity: 'warning',
        title: `Accepted topology "${id}" references a missing artifact`,
        file: ref,
      });
    }
  }
  return findings;
}

/** Concise human summary suitable for gap triage. */
export function summarize(report) {
  if (!report.findings.length) {
    return `✅ Drift audit clean — ${report.scanned} source(s) scanned, no capability drift.`;
  }
  const lines = [
    `❌ Drift audit found ${report.findings.length} issue(s) across ${report.scanned} source(s):`,
  ];
  for (const f of report.findings) {
    lines.push(`   [${f.severity}] ${f.ruleId} ${f.file}${f.line ? ':' + f.line : ''} — ${f.title}`);
  }
  return lines.join('\n');
}
