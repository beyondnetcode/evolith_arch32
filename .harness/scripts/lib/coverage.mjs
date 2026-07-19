/**
 * @file coverage.mjs
 * @description Zero-coverage guardrail for harness checks (GT-557).
 *
 * ## The defect class this closes
 *
 * A guard that scans zero items exits 0. Read literally that is correct — no items, no
 * violations. Read operationally it is a lie: the overwhelmingly likely cause of "zero
 * items" is that the guard looked in the wrong place, not that the corpus is empty.
 * `30-validate-phase-topology-disjoint.mjs` shipped for months reporting 5 topologies
 * instead of 8 and exiting green, because half its roots resolved to nothing.
 *
 * So: **zero scanned is a failure, not a pass.** A check that scanned nothing did not
 * run; it must say so loudly rather than contribute a green tick it did not earn.
 *
 * ## Opting out
 *
 * Some checks legitimately scan an empty corpus (a bootstrapping directory, a feature
 * not yet adopted). `allowEmpty: true` covers that — but it must be written at the call
 * site, with a mandatory `reason`, so the exemption is visible in review and in the diff
 * that introduced it. It is deliberately not settable via config or environment: an
 * exemption that can be granted from outside the code is an exemption nobody reviews.
 */

/**
 * Thrown when a check scanned nothing. Distinct class so callers can tell a coverage
 * failure apart from a genuine rule violation.
 */
export class ZeroCoverageError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ZeroCoverageError';
    this.details = details;
  }
}

/**
 * Assert that a check actually scanned something.
 *
 * @param {number} count how many items were scanned
 * @param {object} opts
 * @param {string} opts.what   what was being scanned, plural noun ('topology manifests')
 * @param {string|string[]} opts.where where it looked — paths or path keys; the single
 *   most useful datum when this fires, because it names the thing that moved
 * @param {string} [opts.reason] why an empty result is acceptable — REQUIRED when allowEmpty
 * @param {boolean} [opts.allowEmpty=false] opt out of the guardrail, stated at the call site
 * @returns {number} the count, so this can be used inline
 * @throws {ZeroCoverageError} when count is 0 and allowEmpty is not set
 * @throws {TypeError} on malformed input, or on allowEmpty without a reason
 */
export function assertScanned(count, opts = {}) {
  const { what, where, reason, allowEmpty = false } = opts;

  if (!Number.isInteger(count) || count < 0) {
    throw new TypeError(`[coverage] assertScanned expects a non-negative integer count, received: ${JSON.stringify(count)}`);
  }
  if (typeof what !== 'string' || what.trim() === '') {
    throw new TypeError('[coverage] assertScanned requires `what` — a plural noun naming what was scanned.');
  }

  const locations = Array.isArray(where) ? where : where == null ? [] : [where];
  if (locations.length === 0) {
    throw new TypeError(
      `[coverage] assertScanned requires \`where\` — the path(s) or path key(s) searched for ${what}. ` +
        'Without it the failure message cannot name what moved, which is the only fact that matters.',
    );
  }

  if (allowEmpty) {
    if (typeof reason !== 'string' || reason.trim() === '') {
      throw new TypeError(
        `[coverage] allowEmpty:true requires an explicit \`reason\` explaining why zero ${what} is acceptable. ` +
          'An unexplained exemption is indistinguishable from the bug this guardrail exists to catch.',
      );
    }
    return count;
  }

  if (count === 0) {
    const rendered = locations.map((l) => `    - ${l}`).join('\n');
    throw new ZeroCoverageError(
      `[coverage] ZERO ${what} scanned — this check did not run.\n` +
        `  Searched:\n${rendered}\n` +
        `  Scanning zero items is not a pass. It almost always means the location moved,\n` +
        `  was renamed, or was never resolved correctly — so the check produced a green\n` +
        `  result without ever inspecting anything.\n` +
        `  Fix the location (see PATH_KEYS in .harness/scripts/lib/paths.mjs). If an empty\n` +
        `  corpus is genuinely expected here, pass { allowEmpty: true, reason: '…' } at this\n` +
        `  call site so the exemption is explicit and reviewable.`,
      { what, where: locations, count },
    );
  }

  return count;
}

/**
 * Assert coverage across several buckets at once, so a check that reads from multiple
 * roots fails when ANY root contributed nothing — the exact shape of the topology bug,
 * where a live root masked a dead one and the total looked plausible.
 *
 * @param {Record<string, number>} counts bucket label -> item count
 * @param {object} opts
 * @param {string} opts.what plural noun naming the items
 * @param {string[]} [opts.allowEmptyBuckets=[]] bucket labels permitted to be empty
 * @param {string} [opts.reason] required when allowEmptyBuckets is non-empty
 * @returns {number} total across all buckets
 */
export function assertScannedPerSource(counts, opts = {}) {
  const { what, allowEmptyBuckets = [], reason } = opts;
  const entries = Object.entries(counts);

  if (entries.length === 0) {
    throw new TypeError('[coverage] assertScannedPerSource requires at least one bucket.');
  }
  if (allowEmptyBuckets.length > 0 && (typeof reason !== 'string' || reason.trim() === '')) {
    throw new TypeError('[coverage] allowEmptyBuckets requires an explicit `reason`.');
  }

  const empty = entries.filter(([label, n]) => n === 0 && !allowEmptyBuckets.includes(label)).map(([label]) => label);

  if (empty.length > 0) {
    throw new ZeroCoverageError(
      `[coverage] ZERO ${what} found in ${empty.length} of ${entries.length} source(s) — this check is only partially running.\n` +
        `  Empty source(s):\n${empty.map((l) => `    - ${l}`).join('\n')}\n` +
        `  Populated source(s) mask this: the total looks plausible while an entire root is\n` +
        `  being skipped. Verify each source resolves to its real location before trusting\n` +
        `  a green result.`,
      { what, empty, counts },
    );
  }

  return entries.reduce((total, [, n]) => total + n, 0);
}

/**
 * Convenience wrapper for the common "walk, then guard" shape: run `fn`, assert the
 * returned array is non-empty, and hand it back.
 *
 * @template T
 * @param {() => T[]} fn producer of the scanned items
 * @param {object} opts see assertScanned
 * @returns {T[]}
 */
export function scanned(fn, opts) {
  const items = fn();
  if (!Array.isArray(items)) {
    throw new TypeError('[coverage] scanned() expects its producer to return an array.');
  }
  assertScanned(items.length, opts);
  return items;
}
