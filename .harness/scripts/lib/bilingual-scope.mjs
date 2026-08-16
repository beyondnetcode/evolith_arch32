/**
 * @file bilingual-scope.mjs
 * @description The EN/ES entry surface — the only pairs the bilingual guards enforce.
 *              ADR-0126.
 *
 * ## What changed and why
 *
 * Until ADR-0126 the bilingual mandate was a path-prefix rule: EVERY English `.md`
 * under `reference/` had to carry an `.es.md` twin, and every existing pair anywhere
 * in the tree had to move on both sides in the same range. Measured 2026-08-16 that
 * is 527 English documents under `reference/` and 724 `.es.md` files repo-wide.
 *
 * The mandate was not wrong, it was unaffordable, and it was charging its whole cost
 * at the wrong door. Two concrete effects, both measured:
 *
 *   1. It consumed the maintainer's translation budget on documents no reader has
 *      ever opened. Over 14 days the repository served 66 views to 14 unique
 *      visitors; `traffic/popular/paths` shows a single `.es.md` among them.
 *   2. It made the first PR from an outside contributor fail by construction.
 *      `66-validate-bilingual-sync` rejects a range that edits an English doc without
 *      its Spanish twin, and its escape hatch is a commit-sha-keyed ALLOWED map that
 *      a stranger cannot populate — the sha does not exist until after they commit.
 *
 * So the mandate narrows to the ENTRY SURFACE: the documents a stranger actually
 * traverses, plus the one board the project treats as its record of truth. Fifteen
 * files. Everything else keeps its existing `.es.md` exactly where it is — nothing is
 * deleted, nothing is stamped, nothing is moved. It simply stops being enforced.
 *
 * ## The honesty requirement this module exists to serve
 *
 * Narrowing a guard's scope and leaving its success message unchanged would produce
 * the precise defect this repository sells a product against: a green tick that reads
 * as "the corpus is consistent" when it means "a corpus I no longer look at was not
 * examined". A rule that was not evaluated is not a rule that passed.
 *
 * `summarizeCoverage` therefore exists so the callers can — and do — print the
 * denominator they dropped, on every run, pass or fail. If you add a caller, print it.
 *
 * ## Adding to the surface
 *
 * Adding a file here is cheap to write and expensive to keep: it commits the
 * maintainer to mirroring every future edit, forever. The bar is that a stranger
 * reaches the document within two clicks of the repository landing page, or that the
 * project treats it as authoritative. If it is neither, leave it out.
 */

/**
 * English halves of the enforced pairs, repo-relative POSIX paths.
 *
 * The first six are the landing surface and the community-health files GitHub itself
 * renders. The eight `reference/` entries are the navigational spine — every one is
 * linked directly from `README.md`, which is what makes them reachable at all. The
 * last is the gap board, included not because a stranger reads it but because the
 * project treats both halves as the record of truth, which is the defect GT-702
 * registered `66-validate-bilingual-sync` to close.
 */
export const ENTRY_SURFACE = Object.freeze([
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CODE_OF_CONDUCT.md',
  'AGENTS.md',
  'MASTER_INDEX.md',
  'docs/guides/evolith-quickstart.md',
  'reference/core/README.md',
  'reference/core/architecture/README.md',
  'reference/core/architecture/foundations/README.md',
  'reference/core/architecture/topologies/README.md',
  'reference/core/control-center/README.md',
  'reference/core/control-center/opportunities/README.md',
  'reference/core/interfaces/README.md',
  'reference/core/sdlc/README.md',
  'reference/core/control-center/gaps/gap-tracking.md',
]);

const ENTRY_SET = new Set(ENTRY_SURFACE);

/** Normalise a repo-relative path to POSIX separators. Windows runners exist. */
export function toPosix(relative) {
  return relative.split('\\').join('/');
}

/**
 * The English half of any `.md` path, or `null` when the path is not markdown.
 * `a.es.md -> a.md`, `a.md -> a.md`.
 */
export function englishHalfOf(relative) {
  const rel = toPosix(relative);
  if (!rel.endsWith('.md')) return null;
  return rel.endsWith('.es.md') ? `${rel.slice(0, -'.es.md'.length)}.md` : rel;
}

/** The Spanish half of an English path. Does not check existence. */
export function spanishHalfOf(englishRelative) {
  return `${toPosix(englishRelative).slice(0, -'.md'.length)}.es.md`;
}

/**
 * Is this path — either half — part of the enforced entry surface?
 *
 * Accepts both halves deliberately: callers hold sometimes the `.md` and sometimes
 * the `.es.md`, and a membership test that only recognised one spelling would let an
 * ES-only edit slip past the very guard that exists to catch it.
 */
export function isEntrySurface(relative) {
  const english = englishHalfOf(relative);
  return english !== null && ENTRY_SET.has(english);
}

/**
 * What was enforced and what was deliberately not, for the coverage line every caller
 * must print.
 *
 * Both numbers are passed IN, deliberately. The first cut of this function derived
 * `enforced` by filtering the caller's candidate list, and the caller happened to hold
 * only the `reference/` corpus — so it reported "9/16 enforced" while 15 of the 16 were
 * in fact being judged, understating the guard's own reach by a third. A summary that
 * infers its numerator from whatever list is nearest will keep doing that. It now takes
 * the two counts it reports and computes nothing.
 *
 * @param enforcedFound  entry-surface English documents actually located on disk.
 * @param releasedPairs  existing EN/ES pairs outside the entry surface — the corpus this
 *                       scope drops on the floor. The honest denominator, and the whole
 *                       point of printing anything at all.
 */
export function summarizeCoverage({ enforcedFound, releasedPairs }) {
  return {
    enforced: enforcedFound,
    declared: ENTRY_SURFACE.length,
    released: releasedPairs,
  };
}

/**
 * The line every bilingual guard prints, pass or fail. Not decoration: without it the
 * guard's green tick claims a corpus it stopped reading.
 */
export function formatCoverageReport(summary) {
  return (
    `  bilingual scope (ADR-0126): ${summary.enforced}/${summary.declared} entry-surface ` +
    `document(s) enforced; ${summary.released} EN/ES pair(s) outside the entry surface ` +
    `were NOT evaluated — their state is unknown, not verified.`
  );
}
