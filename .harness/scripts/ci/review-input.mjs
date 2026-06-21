/**
 * GT-146 — Secure, token-bounded review-input preparation.
 *
 * Pure, provider-neutral helpers that turn a raw `git diff` into a sanitized,
 * policy-relevant, budgeted payload before any LLM provider sees it:
 *   1. redact credentials and sensitive patterns,
 *   2. keep only policy-relevant changed files (drop lockfiles, vendored,
 *      generated, and binary content),
 *   3. bound and chunk the result by measurable byte/token budgets.
 *
 * No network, no provider coupling — safe to unit test in isolation.
 */

const REDACTION = '«REDACTED»';

/** [pattern, replacement] — replacement may be a string or a function. */
const SECRET_PATTERNS = [
  // PEM private keys (any flavor)
  [/-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g, '«REDACTED:private-key»'],
  // JWT (header.payload.signature)
  [/\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/g, '«REDACTED:jwt»'],
  // AWS access key id
  [/\bAKIA[0-9A-Z]{16}\b/g, '«REDACTED:aws-access-key»'],
  // Google API key
  [/\bAIza[0-9A-Za-z_-]{35}\b/g, '«REDACTED:google-api-key»'],
  // GitHub PAT
  [/\bghp_[A-Za-z0-9]{36}\b/g, '«REDACTED:github-token»'],
  // Slack token
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/g, '«REDACTED:slack-token»'],
  // Bearer tokens
  [/\bBearer\s+[A-Za-z0-9._~+/-]{12,}=*/g, 'Bearer «REDACTED»'],
  // Generic secret assignments: FOO_API_KEY = "..." / token: '...'
  [
    /\b([A-Za-z0-9_]*(?:API|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|CREDENTIAL|KEY)[A-Za-z0-9_]*)(\s*[:=]\s*)['"]?([A-Za-z0-9_\-./+=]{12,})['"]?/gi,
    (_m, key, sep) => `${key}${sep}${REDACTION}`,
  ],
];

/** Redact known secret patterns. Returns `{ text, redactions }`. */
export function redactSecrets(input) {
  let text = String(input ?? '');
  let redactions = 0;
  for (const [re, rep] of SECRET_PATTERNS) {
    text = text.replace(re, (...args) => {
      redactions += 1;
      return typeof rep === 'function' ? rep(...args) : rep;
    });
  }
  return { text, redactions };
}

const EXCLUDE_PATH = [
  /(^|\/)node_modules\//,
  /(^|\/)(dist|build|coverage|out)\//,
  /(^|\/)\.evolith\//,
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/,
  /\.min\.(js|css)$/,
  /\.map$/,
  /\.(png|jpe?g|gif|svg|ico|pdf|wasm|lock|zip|gz|tar|woff2?)$/i,
];

const INCLUDE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|rego|json|ya?ml|md)$/i;

/** Split a unified `git diff` into `[{ path, body }]` per file. */
export function parseDiffFiles(diff) {
  const files = [];
  let cur = null;
  for (const line of String(diff ?? '').split('\n')) {
    const m = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (m) {
      if (cur) files.push(cur);
      cur = { path: m[2], body: `${line}\n` };
    } else if (cur) {
      cur.body += `${line}\n`;
    }
  }
  if (cur) files.push(cur);
  return files;
}

/** Keep only policy-relevant, non-binary, non-vendored files. */
export function selectRelevantFiles(diff) {
  const included = [];
  const excluded = [];
  for (const f of parseDiffFiles(diff)) {
    const isBinary = /\nBinary files /.test(f.body);
    const isExcludedPath = EXCLUDE_PATH.some((re) => re.test(f.path));
    const isIncludedExt = INCLUDE_EXT.test(f.path);
    if (isBinary || isExcludedPath || !isIncludedExt) excluded.push(f.path);
    else included.push(f);
  }
  return { included, excluded };
}

/** Coarse token estimate (~4 chars/token); deterministic and provider-agnostic. */
export function estimateTokens(text) {
  return Math.ceil(Buffer.byteLength(String(text ?? ''), 'utf8') / 4);
}

/**
 * Pack file sections into chunks under the byte/token budget. A single file
 * larger than the budget is truncated (and flagged) rather than dropped.
 */
export function budgetAndChunk(sections, { maxBytes = 60000, maxTokens = 15000 } = {}) {
  const limit = Math.max(1, Math.min(maxBytes, maxTokens * 4));
  const chunks = [];
  let cur = '';
  let curBytes = 0;
  let truncated = false;

  for (const s of sections) {
    let body = s.body;
    if (Buffer.byteLength(body, 'utf8') > limit) {
      body = `${body.slice(0, limit)}\n… «TRUNCATED ${s.path}» …\n`;
      truncated = true;
    }
    const b = Buffer.byteLength(body, 'utf8');
    if (curBytes + b > limit && cur) {
      chunks.push(cur);
      cur = '';
      curBytes = 0;
    }
    cur += body;
    curBytes += b;
  }
  if (cur) chunks.push(cur);
  return { chunks, truncated };
}

/**
 * Full pipeline: relevant-file selection → redaction → budget/chunk.
 * Returns the chunks plus non-sensitive telemetry for aggregate reporting.
 */
export function prepareReviewInput(diff, config = {}) {
  const { included, excluded } = selectRelevantFiles(diff);
  let redactions = 0;
  const sections = included.map((f) => {
    const r = redactSecrets(f.body);
    redactions += r.redactions;
    return { path: f.path, body: r.text };
  });
  const { chunks, truncated } = budgetAndChunk(sections, config);
  const bytes = chunks.reduce((n, c) => n + Buffer.byteLength(c, 'utf8'), 0);
  return {
    chunks,
    filesIncluded: included.map((f) => f.path),
    filesExcluded: excluded,
    redactions,
    bytes,
    estTokens: Math.ceil(bytes / 4),
    truncated,
  };
}
