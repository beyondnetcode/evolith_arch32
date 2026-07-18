/**
 * @file generated-doc-exclusions.mjs
 * @description Declared, reasoned exclusions from the bilingual parity policy (UP-004 follow-on).
 *
 * ## The defect class this closes
 *
 * `04-check-bilingual-parity.mjs` enforces "every English document under reference/ must
 * have a Spanish counterpart". It had no exclusion mechanism at all. But four generators
 * emit English-only Markdown into `reference/`, so the guard was red on ~30 files
 * *continuously* — which means it stopped reporting anything. A newly added unpaired
 * hand-written document would have landed invisibly in the middle of a permanent wall of
 * red, indistinguishable from the backlog.
 *
 * A guard that is always failing has the same information content as a guard that is
 * always passing: zero. This is the false-signal class `lib/coverage.mjs` closes from the
 * other direction (a guard that scans nothing and exits green). Same disease, mirrored.
 *
 * ## The rules this module enforces on itself
 *
 * Borrowed deliberately from `coverage.mjs`'s `allowEmpty`, which is only grantable at the
 * call site and only with a written reason:
 *
 * 1. **Declared in source, nowhere else.** There is no env var, no config file, no glob
 *    read from disk. An exemption that can be granted from outside the code is an
 *    exemption nobody reviews. Adding one means editing this file, which means it shows up
 *    in a diff with a `generator` and a `reason` beside it.
 *
 * 2. **Every entry names its generator and its reason.** `generator` is the script that
 *    writes the files; `reason` is why bilingual parity does not apply to them. An
 *    exclusion without a stated generator is rejected at load time by `validateEntries()`,
 *    not silently accepted.
 *
 * 3. **Membership is proven, not asserted.** Where the generator stamps its output, the
 *    entry declares that `marker` and a file is excluded ONLY if it actually contains it.
 *    Drop a hand-written `.md` into `reference/wiki/` and it has no marker, so it is not
 *    excluded and the guard fails on it. Where no marker exists, the entry pins
 *    `expectedFiles`; if the real count drifts, the exclusion is refused outright and the
 *    guard fails loudly rather than quietly widening.
 *
 * 4. **Exclusions are reported, never hidden.** `formatExclusionReport()` prints the count
 *    and reason for each entry on every run, pass or fail. A silent exclusion is a false
 *    green — precisely the thing being removed here.
 *
 * ## What is deliberately NOT excluded
 *
 * Hand-authored orphans under `reference/core/control-center/`, `reference/core/foundations/`,
 * `reference/core/interfaces/` (the `README`/`playbook-*`/`using-the-*` set) and
 * `reference/knowledge/` are real translation debt. They stay red on purpose. Suppressing
 * them here would convert an honest bill into a forged receipt.
 */

/**
 * The exclusion table. Small and explicit by design — a broad glob would let a whole tree
 * drift out of policy on one careless line.
 *
 * @typedef {object} GeneratedDocExclusion
 * @property {string}  id            short stable label, used in output
 * @property {string}  generator     REQUIRED — the script that writes these files
 * @property {string}  reason        REQUIRED — why bilingual parity does not apply
 * @property {(rel: string) => boolean} matches candidate path predicate (repo-relative, POSIX)
 * @property {string}  [marker]      substring the generator stamps into every file it owns.
 *                                   When present, membership is VERIFIED against content.
 * @property {number}  [expectedFiles] required when there is no marker: the exact number of
 *                                   files the generator currently owns. A mismatch refuses
 *                                   the exclusion instead of widening it.
 */

/** @type {GeneratedDocExclusion[]} */
export const GENERATED_DOC_EXCLUSIONS = [
  {
    id: 'knowledge-okf-bundle',
    generator: '.harness/scripts/knowledge-okf-project.mjs',
    reason:
      'Projected OKF bundle. The projector rm -rf’s reference/knowledge/okf/ and rewrites it whole on every run ' +
      '("el proyector es la única mano que escribe aquí"), so nothing hand-written can survive there and a ' +
      'translated .es.md would be deleted on the next projection. Parity belongs to the source corpus under ' +
      'reference/knowledge/canonical/, not to this derived projection. Drift is already policed by ' +
      '`knowledge-okf-project.mjs --verify`.',
    matches: (rel) => rel.startsWith('reference/knowledge/okf/'),
    // No per-file marker: the bundle emits OKF-conformant frontmatter, not a provenance
    // banner. Pinning the count is the substitute proof — see validateEntries().
    expectedFiles: 15,
  },
  {
    id: 'wiki-mirror',
    generator: '.harness/scripts/sync-wiki.mjs',
    reason:
      'GitHub wiki mirror, assembled from docs that already live elsewhere in the repo and are themselves ' +
      'under parity. The wiki is a publication surface for an English-language GitHub audience; translating ' +
      'the mirror would duplicate translations that exist upstream and would be overwritten on next sync.',
    matches: (rel) => rel.startsWith('reference/wiki/'),
    marker: 'Auto-generated from repository documentation. Do not edit directly.',
  },
  {
    id: 'interface-how-to',
    generator: 'src/tests/exploration/gen-howto.ts',
    reason:
      'Derived from live capture of the tested CLI/MCP/REST exploration bindings. Bodies are mostly command ' +
      'invocations and captured responses — literal, untranslatable text. Regenerated from the bindings, so a ' +
      'hand-written .es.md would go stale silently. Note the siblings README/playbook-construction/using-the-* ' +
      'in the same directory are HAND-WRITTEN and remain in scope.',
    matches: (rel) => /^reference\/core\/interfaces\/how-to-[^/]+\.md$/.test(rel),
    marker: 'GENERATED by src/tests/exploration/gen-howto.ts',
  },
  {
    id: 'coverage-dashboard',
    generator: '.harness/scripts/coverage-dashboard.mjs',
    reason:
      'Machine-written status report about bilingual coverage itself — a measurement, not a document. ' +
      'Requiring the coverage report to be translated in order to satisfy the coverage rule it reports on is ' +
      'circular. Regenerated on demand; its own --check mode gates drift.',
    matches: (rel) => rel === 'reference/core/control-center/audits/COVERAGE_REPORT.md',
    marker: '# [OK] Bilingual Coverage Dashboard',
  },
];

/**
 * Reject malformed entries at load time. An exclusion missing its generator or reason is a
 * programming error, and it must not be possible to ship one that merely "works".
 *
 * @param {GeneratedDocExclusion[]} entries
 * @throws {TypeError}
 */
export function validateEntries(entries = GENERATED_DOC_EXCLUSIONS) {
  for (const e of entries) {
    const label = e?.id ?? JSON.stringify(e);
    if (typeof e?.generator !== 'string' || e.generator.trim() === '') {
      throw new TypeError(
        `[bilingual-exclusions] entry "${label}" has no \`generator\`. Every exclusion must name the script ` +
          'that writes the files. An exclusion without a stated generator is indistinguishable from a document ' +
          'someone simply did not want to translate.',
      );
    }
    if (typeof e?.reason !== 'string' || e.reason.trim() === '') {
      throw new TypeError(
        `[bilingual-exclusions] entry "${label}" has no \`reason\`. State why bilingual parity does not apply.`,
      );
    }
    if (typeof e?.matches !== 'function') {
      throw new TypeError(`[bilingual-exclusions] entry "${label}" has no \`matches\` predicate.`);
    }
    if (typeof e.marker !== 'string' && !Number.isInteger(e.expectedFiles)) {
      throw new TypeError(
        `[bilingual-exclusions] entry "${label}" declares neither \`marker\` nor \`expectedFiles\`. One of the ` +
          'two is required so that membership in this exclusion is PROVEN rather than asserted. Without it, ' +
          'a hand-written document dropped into the tree would be silently exempted.',
      );
    }
  }
  return entries;
}

/**
 * Partition candidate English documents into excluded and in-scope.
 *
 * Marker-bearing entries verify each file's content: a file inside the tree that lacks the
 * generator's stamp is NOT excluded, and falls through to the guard as a genuine orphan.
 * Markerless entries are count-pinned: if the real file count differs from `expectedFiles`,
 * the whole exclusion is refused and every file in it becomes in-scope, so the guard goes
 * red instead of quietly covering more ground than was reviewed.
 *
 * @param {string[]} relativePaths repo-relative POSIX paths of English .md files
 * @param {(rel: string) => string} readFile reads a file's content by relative path
 * @param {GeneratedDocExclusion[]} [entries]
 * @returns {{ inScope: string[], excluded: Array<{entry: GeneratedDocExclusion, files: string[]}>, refusals: string[] }}
 */
export function partitionByExclusions(relativePaths, readFile, entries = GENERATED_DOC_EXCLUSIONS) {
  validateEntries(entries);

  const excluded = [];
  const refusals = [];
  const claimed = new Set();

  for (const entry of entries) {
    const candidates = relativePaths.filter((rel) => entry.matches(rel));
    let members = candidates;

    if (typeof entry.marker === 'string') {
      // Proof by provenance stamp.
      members = candidates.filter((rel) => {
        try {
          return readFile(rel).includes(entry.marker);
        } catch {
          return false;
        }
      });
      const unstamped = candidates.filter((rel) => !members.includes(rel));
      if (unstamped.length > 0) {
        refusals.push(
          `[${entry.id}] ${unstamped.length} file(s) matched the path rule but do NOT carry the marker of ` +
            `${entry.generator} — treating them as hand-authored and keeping them IN SCOPE:\n` +
            unstamped.map((r) => `      - ${r}`).join('\n'),
        );
      }
    } else {
      // Proof by pinned inventory.
      if (candidates.length !== entry.expectedFiles) {
        refusals.push(
          `[${entry.id}] EXCLUSION REFUSED — expected ${entry.expectedFiles} generated file(s), found ` +
            `${candidates.length}. The tree owned by ${entry.generator} changed shape. Regenerate it, confirm ` +
            'the new inventory is entirely generator-written, then update `expectedFiles` in ' +
            '.harness/scripts/lib/generated-doc-exclusions.mjs. Until then these files stay in scope.',
        );
        members = [];
      }
    }

    for (const rel of members) claimed.add(rel);
    excluded.push({ entry, files: members });
  }

  return {
    inScope: relativePaths.filter((rel) => !claimed.has(rel)),
    excluded,
    refusals,
  };
}

/**
 * Render the exclusion ledger. Printed on EVERY run, pass or fail — an exclusion the
 * operator cannot see is a false green.
 *
 * @param {ReturnType<typeof partitionByExclusions>} partition
 * @returns {string}
 */
export function formatExclusionReport(partition) {
  const lines = [];
  const total = partition.excluded.reduce((n, x) => n + x.files.length, 0);

  lines.push(`\nBilingual parity — declared exclusions (${total} file(s) exempt from the ES counterpart rule):`);
  for (const { entry, files } of partition.excluded) {
    lines.push(`  • ${entry.id}: ${files.length} file(s) — generated by ${entry.generator}`);
    lines.push(`      reason: ${entry.reason}`);
    lines.push(`      verified by: ${entry.marker ? `content marker "${entry.marker}"` : `pinned inventory of ${entry.expectedFiles} file(s)`}`);
  }

  if (partition.refusals.length > 0) {
    lines.push('\n  Exclusions refused (these files remain IN SCOPE):');
    for (const r of partition.refusals) lines.push(`    ✗ ${r}`);
  }

  return lines.join('\n');
}
