import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

// GT-556/557: `reference/core/sdlc/standards/vision` no longer exists — its three
// inputs split across control-center/{gaps,evidence,maturity-reports}, which is why this
// script crashed. It also counted `.rules.json` under `rulesets/`, a directory that
// still EXISTS but holds only `agents/` — so `rulesetCount` silently reported 0 instead
// of 145. That second bug is the reason a path check alone is not enough: the path was
// live, the corpus was empty, and the snapshot was quietly wrong.
import { REPO_ROOT, resolve as resolveKey, expected, relativeToRoot } from '../lib/paths.mjs';
import { assertScanned } from '../lib/coverage.mjs';

// GT-576: the living maturity assessment marked capabilities `Validated` — a state its own
// section 2 defines as "Passing all quality gates, tests, and active in CI/CD" — while the
// only thing under the "Evidence" bullet was a link to an approved ADR. Pillar 1 claimed
// Row-Level Security and CDC audit trails when no workspace in the tree declares a database
// driver; Pillar 4 claimed "deterministic monorepo builds via Nx" when there is no `nx.json`
// and no `nx` dependency. Both were falsifiable in ten minutes by a reader with a shell.
//
// An ADR is a decision. It is evidence that somebody intended a thing, never that the thing
// exists. So the rule below is deliberately crude and unarguable: to stand as `Validated` a
// capability must point at something a reader can execute or open at a line — a `file:line`
// reference, or a CI workflow/harness gate. Markdown link TARGETS are stripped before the
// check precisely so that a link to an ADR (or to anything else) can never satisfy it; the
// citation has to be legible in the prose.

/** States that assert the capability is live, in either language of the assessment. */
const EXECUTABLE_STATES = new Set(['validated', 'scaled', 'validado', 'escalado']);

/** `src/foo/bar.ts:17` or `sdk-cli-ci.yml:195` or `x.mjs:12-34` — openable at a line. */
const FILE_LINE_REFERENCE = /\b[\w./@-]+\.[A-Za-z0-9]{1,6}:\d+(?:-\d+)?\b/;

/** A CI workflow or harness gate — something that runs and can go red. */
const CI_JOB_REFERENCE = /\b[\w./@-]+\.(?:mjs|ya?ml)\b/;

/** The two language editions of the living assessment. Both are audited; neither is optional. */
const ASSESSMENT_DOCS = ['maturity-assessment.md', 'maturity-assessment.es.md'];

/**
 * Split an assessment edition into its `###` capability blocks.
 *
 * A `##` heading closes the current block, so a capability never absorbs the narrative of
 * the section that follows it.
 *
 * @param {string} markdown
 * @returns {{heading: string, block: string, section: number|null}[]}
 */
function capabilityBlocks(markdown) {
  const blocks = [];
  let heading = null;
  let body = [];
  let section = null;

  const flush = () => {
    if (heading !== null) blocks.push({ heading, block: body.join('\n'), section });
    heading = null;
    body = [];
  };

  for (const line of markdown.split('\n')) {
    const sub = line.match(/^###\s+(.*\S)\s*$/);
    if (sub) {
      flush();
      heading = sub[1];
      continue;
    }
    const top = line.match(/^##\s+(?:(\d+)\.)?/);
    if (top) {
      flush();
      section = top[1] ? Number(top[1]) : null;
      continue;
    }
    if (heading !== null) body.push(line);
  }
  flush();
  return blocks;
}

/** The `State`/`Estado` bullet of a capability block. */
const STATE_BULLET = /^\s*\*\s+\*\*(?:State|Estado):\*\*\s*`([^`]+)`/m;

/**
 * Audit one assessment edition for `Validated` claims that rest on nothing executable.
 *
 * @param {string} markdown  raw document
 * @param {string} source    label used in violation messages
 * @returns {{scanned: number, validated: number, violations: {source: string, heading: string, state: string}[]}}
 */
export function auditValidatedEvidence(markdown, source = '<memory>') {
  const violations = [];
  let scanned = 0;
  let validated = 0;

  for (const { heading, block } of capabilityBlocks(markdown)) {
    const state = block.match(STATE_BULLET)?.[1];
    if (!state) continue;
    scanned += 1;
    if (!EXECUTABLE_STATES.has(state.trim().toLowerCase())) continue;
    validated += 1;
    // Strip markdown link targets: `[ADR-0010](.../0010-x.md)` -> `[ADR-0010]`.
    const prose = block.replace(/\]\([^)]*\)/g, ']');
    if (!FILE_LINE_REFERENCE.test(prose) && !CI_JOB_REFERENCE.test(prose)) {
      violations.push({ source, heading, state: state.trim() });
    }
  }

  return { scanned, validated, violations };
}

// ---------------------------------------------------------------------------
// GT-596: ISO/IEC 33020:2019 rating scale
// ---------------------------------------------------------------------------
//
// The rule above (GT-576) asks only "is there a citation?". That is a presence test, and a
// presence test cannot stop a state drifting upward: one executable line in a block of nine
// aspirational ones satisfies it. GT-596 replaces the homegrown, self-set ladder with the
// process-attribute achievement rating scale of **ISO/IEC 33020:2019** — N / P / L / F,
// Not / Partially / Largely / Fully achieved — and adopts its published percentage bands.
//
// The achievement percentage is NOT declared by the author. It is recomputed here from the
// capability's own evidence bullets, using the weights the document already defines for its
// Evidence-Backed States: an indicator a reader can execute or open at a line counts 1.0, an
// indicator backed only by an approved decision record counts 0.2 (the document's own
// `Designed` weight), an indicator backed by nothing counts 0.0.
//
// The threshold rule is deliberately ONE-SIDED. A rating may not be asserted unless the
// recomputed achievement CROSSES the lower bound of the band it claims; claiming LESS than
// the evidence supports is always legal, because the failure this gap exists for is
// over-claiming, and because GT-576's conservative downgrades must remain valid.

/**
 * ISO/IEC 33020:2019 process-attribute achievement rating scale.
 * Bands are half-open `(lower, upper]` in percent of achievement; `N` also admits 0.
 */
export const ISO_33020_SCALE = [
  { letter: 'N', name: 'Not achieved', lower: 0, upper: 15 },
  { letter: 'P', name: 'Partially achieved', lower: 15, upper: 50 },
  { letter: 'L', name: 'Largely achieved', lower: 50, upper: 85 },
  { letter: 'F', name: 'Fully achieved', lower: 85, upper: 100 },
];

/**
 * The Evidence-Backed State ladder of the assessment, in both editions, with the weight the
 * document assigns to each. The weight is what places a state in an ISO band; nothing here
 * is free to move without the mapping table in section 2 moving with it.
 */
export const STATE_WEIGHT = new Map([
  ['visioned', 0.0], ['visionado', 0.0],
  ['designed', 0.2], ['diseñado', 0.2],
  ['prototyped', 0.5], ['prototipado', 0.5],
  ['implemented', 0.8], ['implementado', 0.8],
  ['validated', 1.0], ['validado', 1.0],
  ['scaled', 1.2], ['escalado', 1.2],
]);

/** @param {number} percent @returns {{letter: string, name: string, lower: number, upper: number}} */
export function bandFor(percent) {
  return ISO_33020_SCALE.find((band) => percent <= band.upper) ?? ISO_33020_SCALE[ISO_33020_SCALE.length - 1];
}

/** The band a declared Evidence-Backed State is allowed to claim. */
function bandForState(state) {
  const weight = STATE_WEIGHT.get(state.trim().toLowerCase());
  if (weight === undefined) return null;
  return bandFor(Math.min(weight * 100, 100));
}

/** A nested evidence bullet — the unit an achievement percentage is computed over. */
const NESTED_BULLET = /^(?:\s{2,}|\t+)[*-]\s+(.*\S)\s*$/;
/** A top-level `Evidence`/`Evidencia` bullet that carries its evidence inline. */
const EVIDENCE_BULLET = /^\s*[*-]\s+\*\*(?:Evidence|Evidencia)[^*]*:\*\*\s*(.*\S)\s*$/;
/** Any top-level bullet — `State`, `Path to`, the rating itself. Never an indicator. */
const ANY_BULLET = /^\s*[*-]\s+/;
/** A markdown link, i.e. a pointer at a decision record or another document. */
const MARKDOWN_LINK = /\[[^\]]*\]\([^)]*\)/;
/** An ADR citation in prose, with or without a link. */
const DECISION_RECORD = /\bADR[-\s]?(?:AI-)?\d+/i;

/** The author-declared rating bullet, in either edition. */
const DECLARED_RATING =
  /^\s*[*-]\s+\*\*(?:ISO\/IEC 33020:2019 rating|Calificación ISO\/IEC 33020:2019):\*\*\s*`([NPLF])`/m;

/**
 * The indicators of a capability block.
 *
 * Nested bullets are the indicators when a capability breaks its evidence out; when it states
 * its evidence on a single line, that line is its one indicator. Continuation lines are folded
 * into the indicator they belong to so a wrapped citation is not lost.
 *
 * @param {string} block
 * @returns {string[]}
 */
export function extractIndicators(block) {
  const nested = [];
  const inline = [];
  let current = null;

  for (const line of block.split('\n')) {
    const child = line.match(NESTED_BULLET);
    if (child) {
      current = { text: child[1] };
      nested.push(current);
      continue;
    }
    const evidence = line.match(EVIDENCE_BULLET);
    if (evidence) {
      current = { text: evidence[1] };
      inline.push(current);
      continue;
    }
    if (ANY_BULLET.test(line)) {
      current = null;
      continue;
    }
    if (current && line.trim()) current.text += ` ${line.trim()}`;
  }

  return (nested.length ? nested : inline).map((indicator) => indicator.text);
}

/**
 * Weight one indicator, using the document's own Evidence-Backed State weights.
 *
 * 1.0 — executable: a `file:line` a reader can open, or a CI job that can go red.
 * 0.2 — decided only: an approved decision record and nothing else (the `Designed` weight).
 * 0.0 — asserted: prose with no citation at all.
 *
 * @param {string} text
 * @returns {number}
 */
export function rateIndicator(text) {
  // Link TARGETS are stripped first, exactly as in the GT-576 rule: a link to
  // `0010-multi-tenancy-architecture-strategy.md` must never read as a file citation.
  const prose = text.replace(/\]\([^)]*\)/g, ']');
  if (FILE_LINE_REFERENCE.test(prose) || CI_JOB_REFERENCE.test(prose)) return 1.0;
  if (MARKDOWN_LINK.test(text) || DECISION_RECORD.test(text)) return 0.2;
  return 0.0;
}

/**
 * Recompute the ISO/IEC 33020:2019 achievement of a capability from its own evidence.
 *
 * @param {string} block
 * @returns {{indicators: number, achieved: number, percent: number, band: object}}
 */
export function rateCapability(block) {
  const indicators = extractIndicators(block);
  // Rounded: 0.2 weights accumulate binary-float noise, and `0.6000000000000001/3` in a
  // violation message reads as a bug in the gate rather than a defect in the document.
  const achieved = Math.round(indicators.reduce((total, text) => total + rateIndicator(text), 0) * 100) / 100;
  const percent = indicators.length ? Math.round((achieved / indicators.length) * 1000) / 10 : 0;
  return { indicators: indicators.length, achieved, percent, band: bandFor(percent) };
}

/** Does `percent` cross into the claimed band? `N` has no lower bound to cross. */
function crossesThreshold(percent, band) {
  return band.letter === 'N' ? percent <= band.upper : percent > band.lower;
}

/**
 * Audit one assessment edition against the ISO/IEC 33020:2019 scale.
 *
 * Two rules, both mechanical:
 *   1. the declared letter must be the band of the declared Evidence-Backed State;
 *   2. the achievement recomputed from the block's own evidence must CROSS that band.
 *
 * The state tables of sections 6 and 9 carry a letter but no evidence bullets, so only
 * rule (1) applies to them — stated as such in section 2 rather than left implicit.
 *
 * @param {string} markdown
 * @param {string} source
 * @returns {{scanned: number, rows: number, violations: object[], ratings: object[]}}
 */
export function auditIsoRatings(markdown, source = '<memory>') {
  const violations = [];
  const ratings = [];
  let scanned = 0;

  for (const { heading, block } of capabilityBlocks(markdown)) {
    const rawState = block.match(STATE_BULLET)?.[1];
    if (!rawState) continue;
    scanned += 1;
    const state = rawState.trim();
    const expected = bandForState(state);
    if (!expected) {
      violations.push({ source, heading, state, rule: 'unknown-state', detail: 'no weight is defined for this state' });
      continue;
    }
    const declared = block.match(DECLARED_RATING)?.[1];
    if (!declared) {
      violations.push({
        source, heading, state, rule: 'missing-rating',
        detail: `no ISO/IEC 33020:2019 rating is declared (the state maps to \`${expected.letter}\`)`,
      });
      continue;
    }
    if (declared !== expected.letter) {
      violations.push({
        source, heading, state, rule: 'band-mismatch',
        detail: `declares \`${declared}\` but state \`${state}\` maps to \`${expected.letter}\` (${expected.name})`,
      });
      continue;
    }
    const rating = rateCapability(block);
    if (rating.indicators === 0) {
      violations.push({
        source, heading, state, rule: 'no-indicators',
        detail: 'a rating was declared over zero evidence indicators, so nothing was measured',
      });
      continue;
    }
    if (!crossesThreshold(rating.percent, expected)) {
      violations.push({
        source, heading, state, rule: 'threshold-not-crossed',
        detail: `achievement recomputed at ${rating.percent}% (${rating.achieved}/${rating.indicators} indicators) `
          + `does not cross \`${expected.letter}\` (>${expected.lower}%)`,
      });
      continue;
    }
    ratings.push({ source, heading, state, letter: declared, percent: rating.percent, indicators: rating.indicators });
  }

  const rows = auditStateTableRows(markdown, source, violations);
  return { scanned, rows, violations, ratings };
}

/** Sections whose tables carry an Evidence-Backed State per row rather than per block. */
const STATE_TABLE_SECTIONS = new Set([6, 9, 12]);

/**
 * Rule (1) applied to the state tables of sections 6 and 9: the letter next to a state must
 * be the band that state maps to. These rows have no evidence bullets, so no achievement is
 * recomputed for them — which section 2 says out loud instead of leaving it to be discovered.
 */
function auditStateTableRows(markdown, source, violations) {
  let section = null;
  let rows = 0;

  for (const line of markdown.split('\n')) {
    const heading = line.match(/^##\s+(?:(\d+)\.)?/);
    if (heading) {
      section = heading[1] ? Number(heading[1]) : null;
      continue;
    }
    if (!STATE_TABLE_SECTIONS.has(section) || !line.trim().startsWith('|')) continue;
    const tokens = [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    const index = tokens.findIndex((token) => STATE_WEIGHT.has(token.trim().toLowerCase()));
    if (index === -1) continue;
    rows += 1;
    const state = tokens[index].trim();
    const expected = bandForState(state);
    const declared = tokens[index + 1];
    const label = line.match(/\|\s*\*\*([^*]+)\*\*/)?.[1]?.trim() ?? line.trim().slice(0, 60);
    if (!declared || !/^[NPLF]$/.test(declared)) {
      violations.push({
        source, heading: `§${section} — ${label}`, state, rule: 'missing-rating',
        detail: `the row states \`${state}\` with no ISO/IEC 33020:2019 letter beside it (expected \`${expected.letter}\`)`,
      });
      continue;
    }
    if (declared !== expected.letter) {
      violations.push({
        source, heading: `§${section} — ${label}`, state, rule: 'band-mismatch',
        detail: `declares \`${declared}\` but state \`${state}\` maps to \`${expected.letter}\` (${expected.name})`,
      });
    }
  }
  return rows;
}

/**
 * Negative self-test for the rule above.
 *
 * This runs on EVERY invocation, not in a test file somebody may forget to wire up. The
 * defect this whole gap is about is a control that has never been observed failing, so the
 * rule is fed a deliberately bad input on every run and must reject it. If the assertions
 * below stop holding — a regex loosened, the parser skipping ES, the auditor quietly
 * scanning zero blocks — the gate goes red here, before it ever looks at the real document.
 *
 * @throws {Error} when the rule fails to behave as specified
 */
export function selfTestValidatedEvidenceRule() {
  const failures = [];
  const check = (label, condition) => { if (!condition) failures.push(label); };

  // (1) RED: `Validated` backed by an ADR link alone. This is the exact shape that shipped.
  const adrOnly = [
    '### Pillar 1: Security & Compliance — **Level 4 (Managed)**',
    '* **State:** `Validated`',
    '* **Evidence:**',
    '  * Multi-tenant data isolation via Row-Level Security ([ADR-0010](../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md)).',
    '  * Immutable audit trails via CDC ([ADR-0016](../../architecture/adrs/core/0016-immutable-business-audit-trail.md)).',
  ].join('\n');
  const red = auditValidatedEvidence(adrOnly, 'self-test:adr-only');
  check('an ADR-only `Validated` capability must be rejected', red.violations.length === 1);
  check('the rejection must name the capability', /Pillar 1/.test(red.violations[0]?.heading ?? ''));

  // (2) RED in Spanish too — the ES edition is a published surface, not a translation artifact.
  const adrOnlyEs = [
    '### Pilar 1: Seguridad y Compliance — **Nivel 4 (Gestionado)**',
    '* **Estado:** `Validado`',
    '* **Evidencia:**',
    '  * Aislamiento multi-tenant vía RLS ([ADR-0010](../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.es.md)).',
  ].join('\n');
  check('an ADR-only `Validado` capability must be rejected',
    auditValidatedEvidence(adrOnlyEs, 'self-test:adr-only-es').violations.length === 1);

  // (3) GREEN: a `file:line` reference satisfies the rule.
  const withFileLine = adrOnly.replace(
    '* **Evidence:**',
    '* **Evidence:** `src/apps/core-api/src/tracing.ts:7`',
  );
  check('a `file:line` reference must satisfy `Validated`',
    auditValidatedEvidence(withFileLine, 'self-test:file-line').violations.length === 0);

  // (4) GREEN: a CI job reference satisfies the rule.
  const withCiJob = adrOnly.replace(
    '* **Evidence:**',
    '* **Evidence:** job `codeql-analysis` in `.github/workflows/sdk-cli-ci.yml`',
  );
  check('a CI job reference must satisfy `Validated`',
    auditValidatedEvidence(withCiJob, 'self-test:ci-job').violations.length === 0);

  // (5) The `.md` target of an ADR link must NOT be mistaken for a file reference, even when
  //     the filename is full of digits. This is the loophole that would silently reopen the gap.
  const digitsInAdrTarget = adrOnly.replace(
    '* **Evidence:**',
    '* **Evidence:** see [ADR-0010](../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md)',
  );
  check('an ADR link target must never count as evidence',
    auditValidatedEvidence(digitsInAdrTarget, 'self-test:adr-target').violations.length === 1);

  // (6) Non-`Validated` states are not policed — the rule must not turn `Designed` red.
  check('a `Designed` capability with only an ADR must pass',
    auditValidatedEvidence(adrOnly.replace('`Validated`', '`Designed`'), 'self-test:designed').violations.length === 0);

  // (7) Anti-vacuous pass: an auditor that parsed no capability blocks has not audited anything.
  check('a document with no capability blocks must scan zero, and be reported as such',
    auditValidatedEvidence('# Narrative only\n\nNo capabilities here.', 'self-test:empty').scanned === 0);

  if (failures.length) {
    throw new Error(
      'GT-576 evidence rule self-test FAILED — the guard no longer detects the defect it exists for:\n- '
      + failures.join('\n- '),
    );
  }
  return { assertions: 7 };
}

/**
 * Negative self-test for the ISO/IEC 33020:2019 threshold rule (GT-596).
 *
 * Same contract as the rule above and for the same reason: it runs on EVERY invocation, and
 * the FIRST thing it does is prove the rule goes red on input that must be rejected. A guard
 * nobody has seen fail is indistinguishable from no guard.
 *
 * @throws {Error} when the rule fails to behave as specified
 */
export function selfTestIsoRatingRule() {
  const failures = [];
  const check = (label, condition) => { if (!condition) failures.push(label); };
  const rules = (markdown, source) => auditIsoRatings(markdown, source).violations.map((v) => v.rule);

  const capability = ({ state = 'Validated', rating = '`F`', evidence }) => [
    '### Pillar 1: Security & Compliance — **Level 4 (Managed)**',
    `* **State:** \`${state}\``,
    `* **ISO/IEC 33020:2019 rating:** ${rating}`,
    '* **Evidence:**',
    ...evidence.map((line) => `  * ${line}`),
    '* **Path to Level 5:** automated penetration testing in CI.',
  ].join('\n');

  const adrOnly = [
    'Multi-tenant isolation via RLS ([ADR-0010](../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md)).',
    'Immutable audit trails via CDC ([ADR-0016](../../architecture/adrs/core/0016-immutable-business-audit-trail.md)).',
  ];
  const executable = [
    'CodeQL — job `codeql-analysis` at `.github/workflows/sdk-cli-ci.yml:362`.',
    'Telemetry — `NodeSDK` bootstrapped at `src/apps/core-api/src/tracing.ts:7`.',
  ];

  // (1) RED — the defect itself: `F` claimed over evidence that recomputes to 20%. This is
  //     the shape GT-576 had to correct by hand, and the shape the old presence test allowed
  //     the moment a single citation appeared anywhere in the block.
  check('an `F` claimed over ADR-only evidence must be rejected',
    rules(capability({ evidence: adrOnly }), 'self-test:iso-under-threshold').includes('threshold-not-crossed'));

  // (2) RED — one executable citation does not buy `F` for a block of five. Precisely what a
  //     presence test cannot see: 1 of 5 is 20 + 4×0.2 → 36%, which is `P`.
  check('one executable citation among five indicators must not sustain `F`',
    rules(capability({ evidence: [executable[0], ...adrOnly, ...adrOnly] }), 'self-test:iso-one-of-five')
      .includes('threshold-not-crossed'));

  // (3) RED — the band boundary is closed at the top: 50% is `P`, never `L`. An `Implemented`
  //     capability with 1 executable and 1 unsupported indicator sits exactly on it.
  check('exactly 50% must not sustain `L`',
    rules(capability({ state: 'Implemented', rating: '`L`', evidence: [executable[0], 'Load testing is planned.'] }),
      'self-test:iso-boundary').includes('threshold-not-crossed'));

  // (4) RED — a letter that does not belong to the declared state, whatever the evidence says.
  check('a letter above the declared state must be rejected',
    rules(capability({ state: 'Implemented', rating: '`F`', evidence: executable }), 'self-test:iso-band')
      .includes('band-mismatch'));

  // (5) RED — a state with no rating at all. Silence must not read as compliance.
  check('a capability with no declared rating must be rejected',
    rules([
      '### Pillar 1: Security & Compliance',
      '* **State:** `Validated`',
      '* **Evidence:** `src/apps/core-api/src/tracing.ts:7`',
    ].join('\n'), 'self-test:iso-missing').includes('missing-rating'));

  // (6) RED in Spanish — the ES edition is a published surface, not a translation artifact.
  check('an ADR-only `Validado` capability must be rejected in the ES edition',
    rules([
      '### Pilar 1: Seguridad y Compliance',
      '* **Estado:** `Validado`',
      '* **Calificación ISO/IEC 33020:2019:** `F`',
      '* **Evidencia:**',
      '  * Aislamiento multi-tenant vía RLS ([ADR-0010](../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.es.md)).',
    ].join('\n'), 'self-test:iso-es').includes('threshold-not-crossed'));

  // (7) RED — a rating declared over zero indicators measured nothing.
  check('a rating over zero indicators must be rejected',
    rules([
      '### Pillar 1: Security & Compliance',
      '* **State:** `Validated`',
      '* **ISO/IEC 33020:2019 rating:** `F`',
      '* **Path to Level 5:** automated penetration testing in CI.',
    ].join('\n'), 'self-test:iso-vacuous').includes('no-indicators'));

  // (8) RED — a section 6/9 table row whose letter contradicts its state.
  check('a state table row with the wrong letter must be rejected',
    rules('## 6. Pattern Maturity Matrix\n\n| **Strangler Fig** | Critical | `Validated` | `L` | Rationale. |',
      'self-test:iso-table').includes('band-mismatch'));

  // (9) GREEN — fully executable evidence sustains `F`.
  check('`F` over fully executable evidence must pass',
    rules(capability({ evidence: executable }), 'self-test:iso-green').length === 0);

  // (10) GREEN — the rule is ONE-SIDED. Under-claiming is legal, because GT-576's downgrades
  //      are under-claims and must stay valid: `Designed` over 100% executable evidence passes.
  check('claiming less than the evidence supports must remain legal',
    rules(capability({ state: 'Designed', rating: '`P`', evidence: executable }), 'self-test:iso-conservative')
      .length === 0);

  // (11) GREEN — a `Visioned` capability rates `N`, which has no lower bound to cross.
  check('`N` must be reachable with no evidence at all',
    rules(capability({ state: 'Visioned', rating: '`N`', evidence: ['Read-models only when write contention demands it.'] }),
      'self-test:iso-visioned').length === 0);

  // (12) Anti-vacuous pass: an auditor that parsed nothing has not audited anything.
  check('a document with no capability blocks must scan zero, and be reported as such',
    auditIsoRatings('# Narrative only\n\nNo capabilities here.', 'self-test:iso-empty').scanned === 0);

  if (failures.length) {
    throw new Error(
      'GT-596 ISO/IEC 33020:2019 threshold rule self-test FAILED — the guard no longer detects the '
      + 'defect it exists for:\n- ' + failures.join('\n- '),
    );
  }
  return { assertions: 12 };
}

/**
 * Run the rule over both editions of the living assessment.
 *
 * @returns {{scanned: number, validated: number, violations: object[]}}
 */
export function auditAssessments() {
  const violations = [];
  let scanned = 0;
  let validated = 0;

  for (const name of ASSESSMENT_DOCS) {
    // resolveKey fail-closes: a moved assessment must not read as "nothing to audit".
    const file = resolveKey('maturityReports', name);
    const result = auditValidatedEvidence(fs.readFileSync(file, 'utf8'), name);
    scanned += result.scanned;
    validated += result.validated;
    violations.push(...result.violations);
  }

  // A zero-block scan means the document structure moved, not that the document is clean.
  assertScanned(scanned, { what: 'maturity capability blocks', where: ASSESSMENT_DOCS });
  return { scanned, validated, violations };
}

/**
 * Run the ISO/IEC 33020:2019 rule over both editions of the living assessment.
 *
 * @returns {{scanned: number, rows: number, violations: object[], ratings: object[]}}
 */
export function auditAssessmentRatings() {
  const violations = [];
  const ratings = [];
  let scanned = 0;
  let rows = 0;

  for (const name of ASSESSMENT_DOCS) {
    const file = resolveKey('maturityReports', name);
    const result = auditIsoRatings(fs.readFileSync(file, 'utf8'), name);
    scanned += result.scanned;
    rows += result.rows;
    violations.push(...result.violations);
    ratings.push(...result.ratings);
  }

  assertScanned(scanned, { what: 'ISO/IEC 33020 rated capability blocks', where: ASSESSMENT_DOCS });
  assertScanned(rows, { what: 'ISO/IEC 33020 rated state table rows', where: ASSESSMENT_DOCS });
  return { scanned, rows, violations, ratings };
}

const ROOT = REPO_ROOT;
const BOARD = resolveKey('gapTracking');
const REGISTRY = resolveKey('gapClosureEvidence');
const CLI_PACKAGE = resolveKey('cliPackageJson');
const RUNTIME_EVIDENCE = resolveKey('maturityEvidence');
const OUTPUT = expected('maturityReports', 'maturity-reconciliation.json');
// PASS: green observed run. BLOCKED: failing/unmet, must map to an active gap.
// RESOLVED: the blocking gap is closed in code (cites its closure commit) and the
// only residual is a runtime re-run; it maps to a closed gap and does not require a
// workflow-run URL, because that run is what is still pending.
const EVIDENCE_STATUSES = new Set(['PASS', 'BLOCKED', 'RESOLVED']);
const REQUIRED_CHECKS = new Set(['cli-baseline', 'coverage', 'documentation', 'release']);

function countFiles(directory, pattern, excludePattern) {
  if (!fs.existsSync(directory)) return 0;
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return total + countFiles(target, pattern, excludePattern);
    return total + Number(pattern.test(entry.name) && (!excludePattern || !excludePattern.test(entry.name)));
  }, 0);
}

export function parseBoard(content) {
  const lastUpdated = content.match(/\*\*Last Updated:\*\* (\d{4}-\d{2}-\d{2})/)?.[1];
  const statuses = [...content.matchAll(/^\| \[`(?:GT-\d+|MT-A\d+)`]\([^)]*\) .*\| `(DONE|OPEN|PENDING|DEFERRED|IN-PROGRESS)` \|$/gm)]
    .map((match) => (match[1] === 'OPEN' ? 'PENDING' : match[1]));
  const counts = {
    total: statuses.length,
    done: statuses.filter((status) => status === 'DONE').length,
    pending: statuses.filter((status) => status === 'PENDING').length,
    inProgress: statuses.filter((status) => status === 'IN-PROGRESS').length,
    deferred: statuses.filter((status) => status === 'DEFERRED').length,
  };
  if (!lastUpdated || counts.total === 0) throw new Error('Could not parse the canonical gap board');
  return { lastUpdated, counts };
}

function commitExists(root, commit) {
  try {
    execFileSync('git', ['cat-file', '-e', `${commit}^{commit}`], {
      cwd: root,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

export function validateRuntimeEvidence(evidence, board, root = ROOT, now = new Date()) {
  const errors = [];
  const checks = Array.isArray(evidence?.checks) ? evidence.checks : [];
  const activeGaps = new Set(
    [...board.content.matchAll(/^\| \[`(GT-\d+|MT-A\d+)`]\([^)]*\) .*\| `(OPEN|PENDING|DEFERRED|IN-PROGRESS)` \|$/gm)]
      .map((match) => match[1]),
  );
  const closedGaps = new Set(
    [...board.content.matchAll(/^\| \[`(GT-\d+|MT-A\d+)`]\([^)]*\) .*\| `DONE` \|$/gm)]
      .map((match) => match[1]),
  );
  const ids = new Set();

  if (evidence?.schemaVersion !== '1.0.0') errors.push('Unsupported maturity evidence schemaVersion');
  if (evidence?.asOf !== board.lastUpdated) errors.push('Maturity evidence date differs from the gap board');

  for (const check of checks) {
    if (!check?.id || ids.has(check.id)) errors.push(`Invalid or duplicate maturity check: ${check?.id || '<missing>'}`);
    ids.add(check?.id);
    if (!EVIDENCE_STATUSES.has(check?.status)) errors.push(`${check?.id} has unsupported status`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(check?.observedAt || '')) {
      errors.push(`${check?.id} has invalid observedAt`);
    } else {
      const ageDays = Math.floor((now - new Date(`${check.observedAt}T00:00:00Z`)) / 86400000);
      if (ageDays < 0 || ageDays > 30) errors.push(`${check.id} evidence is stale or future-dated`);
    }
    if (!/^[0-9a-f]{7,40}$/i.test(check?.commit || '') || !commitExists(root, check.commit)) {
      errors.push(`${check?.id} references an unavailable commit`);
    }
    if (check?.status !== 'RESOLVED'
      && !/^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+$/.test(check?.source || '')) {
      errors.push(`${check?.id} has an invalid workflow source`);
    }
    if (typeof check?.summary !== 'string' || !check.summary.trim()) errors.push(`${check?.id} lacks a summary`);
    if (check?.status === 'BLOCKED' && (!check.gap || !activeGaps.has(check.gap))) {
      errors.push(`${check?.id} must map BLOCKED evidence to an active gap`);
    }
    if (check?.status === 'RESOLVED' && (!check.gap || !closedGaps.has(check.gap))) {
      errors.push(`${check?.id} must map RESOLVED evidence to a closed gap`);
    }
    if (check?.status === 'PASS' && check?.gap) errors.push(`${check.id} PASS evidence cannot declare a blocking gap`);
  }

  for (const required of REQUIRED_CHECKS) {
    if (!ids.has(required)) errors.push(`Missing required maturity check: ${required}`);
  }
  return errors;
}

// A count of zero from a directory that exists means the corpus moved, not that it is
// empty — the exact shape of the `rulesets/` regression above.
function counted(what, where, n) {
  return assertScanned(n, { what, where });
}

export function buildSnapshot(root = ROOT) {
  const boardContent = fs.readFileSync(path.join(root, 'reference/core/control-center/gaps/gap-tracking.md'), 'utf8');
  const board = { ...parseBoard(boardContent), content: boardContent };
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'reference/core/control-center/evidence/gap-closure-evidence.json'), 'utf8'));
  const cliPackage = JSON.parse(fs.readFileSync(path.join(root, 'src/sdk/cli/package.json'), 'utf8'));
  const runtimeEvidence = JSON.parse(fs.readFileSync(path.join(root, 'reference/core/control-center/maturity-reports/maturity-evidence.json'), 'utf8'));
  const closures = registry.closures || [];

  const gtDoneCount = [...board.content.matchAll(/^\| \[`GT-\d+`]\([^)]*\) .*\| `DONE` \|$/gm)].length;
  const mtClosureCount = closures.filter((c) => c.id && c.id.startsWith('MT-')).length;
  const expectedClosures = gtDoneCount + mtClosureCount;

  if (closures.length !== expectedClosures) {
    throw new Error(`Closure evidence count (${closures.length}) differs from required closures (${expectedClosures})`);
  }
  const evidenceErrors = validateRuntimeEvidence(runtimeEvidence, board, root);
  if (evidenceErrors.length) throw new Error(`Invalid runtime maturity evidence:\n- ${evidenceErrors.join('\n- ')}`);

  return {
    schemaVersion: '1.0.0',
    scope: 'evolith-core',
    asOf: board.lastUpdated,
    gaps: board.counts,
    evidence: {
      closureRecords: closures.length,
      cliPackage: `${cliPackage.name}@${cliPackage.version}`,
      adrCount: counted('ADRs', 'adrs', countFiles(resolveKey('adrs'), /^\d{4}-.*\.md$/, /\.es\.md$/)),
      // `rulesets` (no `src/` prefix) resolved to a real but unrelated directory, so this
      // counted 0 for months without failing. Now it counts the real corpus and asserts it.
      rulesetCount: counted('rulesets', 'topologiesRulesets', countFiles(resolveKey('rulesets'), /\.rules\.json$/)),
      schemaCount: counted('ruleset schemas', 'rulesetSchemas', countFiles(resolveKey('rulesetSchemas'), /\.schema\.json$/)),
    },
    readiness: runtimeEvidence.checks,
    externalProducts: [
      { name: 'Evolith Tracker', maturityIncluded: false, reason: 'Independent product repository and evidence lifecycle' },
      { name: 'Evolith Product Suite', maturityIncluded: false, reason: 'Product strategy scope is not Core implementation evidence' },
    ],
    sources: [
      'reference/core/control-center/gaps/gap-tracking.md',
      'reference/core/control-center/evidence/gap-closure-evidence.json',
      'reference/core/control-center/maturity-reports/maturity-evidence.json',
      'reference/core/control-center/maturity-reports/inventory-summary.md',
      'src/sdk/cli/package.json',
    ],
    validationCommands: [
      'node .harness/scripts/ci/09-reconcile-maturity.mjs --check',
      'node .harness/scripts/ci/08-validate-tracking.mjs',
      'npm test --workspace src/sdk/cli -- --runInBand',
    ],
  };
}

function serialize(snapshot) {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

function run() {
  // GT-576/GT-596: prove both rules still bite BEFORE trusting their verdict on the real
  // document. A guard that has never been observed failing is the defect, not the control.
  const { assertions } = selfTestValidatedEvidenceRule();
  const { assertions: isoAssertions } = selfTestIsoRatingRule();

  const audit = auditAssessments();
  if (audit.violations.length) {
    console.error(
      `❌ ${audit.violations.length} capability/capabilities are marked as live with no executable evidence.\n`
      + `   "Validated" means passing quality gates, tests and active in CI/CD. An approved ADR proves\n`
      + `   intent, never implementation — cite a file:line or a CI job, or downgrade the state.\n`
      + audit.violations.map((v) => `   - [${v.source}] ${v.heading} — state \`${v.state}\``).join('\n'),
    );
    process.exit(1);
  }
  console.log(
    `✅ Evidence rule: ${audit.validated}/${audit.scanned} capability blocks claim a live state, `
    + `all backed by a file:line or a CI job (${assertions} self-test assertions passed).`,
  );

  const iso = auditAssessmentRatings();
  if (iso.violations.length) {
    console.error(
      `❌ ${iso.violations.length} ISO/IEC 33020:2019 rating(s) are not sustained by the evidence.\n`
      + `   A rating is not a label: the achievement percentage is recomputed from the capability's own\n`
      + `   indicators and must CROSS the lower bound of the band it claims. Cite executable evidence,\n`
      + `   or declare the band the evidence actually reaches.\n`
      + iso.violations.map((v) => `   - [${v.source}] ${v.heading} (${v.rule}) — ${v.detail}`).join('\n'),
    );
    process.exit(1);
  }
  console.log(
    `✅ ISO/IEC 33020:2019 rating rule: ${iso.scanned} capability blocks and ${iso.rows} state table rows `
    + `carry a rating whose recomputed achievement crosses its band (${isoAssertions} self-test assertions passed).`,
  );

  const expected = serialize(buildSnapshot());
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== expected) {
      console.error('❌ Maturity reconciliation is stale. Run: node .harness/scripts/ci/09-reconcile-maturity.mjs');
      process.exit(1);
    }
    console.log('✅ Maturity reconciliation matches the canonical Core evidence.');
    return;
  }
  fs.writeFileSync(OUTPUT, expected, 'utf8');
  console.log(`✅ Generated ${path.relative(ROOT, OUTPUT)}`);
}

// `process.argv[1]` is undefined under `node -e` / `--input-type=module`; guard it so the
// module can be imported by an ad-hoc harness without crashing in pathToFileURL.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
