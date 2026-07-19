#!/usr/bin/env node
/**
 * generate-adr-rulesets.mjs
 *
 * Honest, maintainable ADR -> ruleset generator.
 *
 * - Walks the 5 ADR tracks under reference/core/architecture/adrs/{core,nodejs,dotnet,ai-augmented,android}.
 * - Parses each ADR (id, title, status, date, decision summary) from markdown headers,
 *   tolerating the several heading formats present in the repo:
 *     * `# ADR-XXXX: Title`  and  `# [ADR XXXX](file.md): Title`
 *     * `## Status` / `## Date` sections  and  `## N. Status` with inline `**Status**:` / `**Date**:`
 *     * `## Decision and Rationale`, `## Decision`, `## Decisions`, `## N. Decision...`
 * - Classifies enforcement heuristically (executable vs advisory; conservative default = advisory).
 * - Skips ADRs already covered by handcrafted rulesets in rulesets/adr/*.rules.json
 *   (matched by track+id derived from each handcrafted ruleset's first reference).
 * - Emits deterministic, idempotent rulesets to rulesets/adr/generated/.
 * - Supports `--check` (no writes; fails on drift / missing coverage) and prints a summary.
 *
 * Environment constraints honored: no file deletion, no npm install. Pure Node + fs.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, relative } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..');

const ADR_BASE = join(REPO_ROOT, 'reference', 'core', 'architecture', 'adrs');
const TRACKS = ['core', 'nodejs', 'dotnet', 'ai-augmented', 'android'];
const HANDCRAFTED_DIR = join(REPO_ROOT, 'src', 'rulesets', 'adr');
const GENERATED_DIR = join(HANDCRAFTED_DIR, 'generated');
const SCHEMA_REL_FROM_GENERATED = '../../schema/ruleset-standard.schema.json';

const EXCLUDE_FILE_RE = /(\.es\.md$|^readme|^README|^adr-matrix|^adr-authoring|^index|^template|^standard)/i;

const EXECUTABLE_SIGNALS = [
  'must not', 'must', 'forbidden', 'prohibited', 'required', 'shall not', 'shall',
  'dependency', 'dependencies', 'layer', 'lint', 'eslint', 'coverage', 'naming',
  'structure', 'static analysis', 'ci/cd', 'ci gate', 'quality gate', 'pinning',
  'enforce', 'enforced', 'boundaries', 'import', 'schema validation', 'threshold',
];

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function listAdrFiles() {
  const files = [];
  const missingTracks = [];
  if (!existsSync(ADR_BASE)) {
    throw new Error(
      `ADR base directory does not exist: ${ADR_BASE}\n` +
      `This generator scans the ADR corpus; a missing base means every count it ` +
      `reports is meaningless. Fix the path rather than letting the scan return empty.`
    );
  }
  for (const track of TRACKS) {
    const dir = join(ADR_BASE, track);
    if (!existsSync(dir)) { missingTracks.push(track); continue; }
    for (const name of readdirSync(dir).sort()) {
      if (!name.endsWith('.md')) continue;
      if (EXCLUDE_FILE_RE.test(name)) continue;
      // Canonical filename is `NNNN-slug.md`. `ADR-NNNN-Slug.md` is a legacy
      // non-conforming form that is nonetheless a real ADR -- match it too, or
      // the corpus silently loses an entry (this is how the count sat at 132
      // while the corpus held 133).
      if (!/^\d{4}-/.test(name) && !/^ADR-\d{4}-/i.test(name)) continue;
      files.push({ track, name, path: join(dir, name) });
    }
  }
  if (missingTracks.length) {
    throw new Error(
      `ADR track directories missing under ${ADR_BASE}: ${missingTracks.join(', ')}\n` +
      `Refusing to report coverage over a partial corpus.`
    );
  }
  if (files.length === 0) {
    throw new Error(
      `Scanned ${ADR_BASE} and found zero ADRs.\n` +
      `A zero-ADR scan must never be reported as "no drift, all ADRs covered" -- ` +
      `that is a vacuous pass and it hid this generator's dead paths for weeks.`
    );
  }
  return files;
}

/** Normalize a heading: drop a leading "N." section number, trim. */
function normalizeHeading(h) {
  return h.replace(/^\d+(\.\d+)*\.?\s+/, '').trim();
}

/** Extract the body of a `## <Heading>` section (number-prefix tolerant) until the next `## `. */
function extractSection(md, headingRegex) {
  const lines = md.split('\n');
  let capturing = false;
  const out = [];
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      if (capturing) break;
      capturing = headingRegex.test(normalizeHeading(h2[1]));
      continue;
    }
    if (capturing) out.push(line);
  }
  return out.join('\n').trim();
}

/** Pull an inline labeled value from anywhere in the text. Handles:
 *  `**Status**: Approved`, `**Status:** Approved`, `* **Status:** Approved`, `Status: Approved`. */
function inlineLabel(md, label) {
  const patterns = [
    new RegExp(`\\*\\*${label}\\*\\*\\s*:?\\s*(.+)`, 'i'),   // **Status**: X
    new RegExp(`\\*\\*${label}\\s*:\\s*\\*\\*\\s*(.+)`, 'i'), // **Status:** X
    new RegExp(`^\\s*[*-]?\\s*${label}\\s*:\\s*(.+)$`, 'im'),     // Status: X / * Status: X
  ];
  for (const re of patterns) {
    const m = md.match(re);
    if (m && m[1]) return m[1].replace(/[*_`]/g, '').trim();
  }
  return '';
}

function firstMeaningfulSentence(text, max = 320) {
  if (!text) return '';
  const cleaned = text
    .replace(/^#+\s+.*$/gm, '')
    .replace(/\|.*\|/g, ' ')      // drop markdown table rows
    .replace(/[*_`>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  let acc = '';
  for (const s of sentences) {
    const candidate = acc ? `${acc} ${s}` : s;
    if (candidate.length > max) break;
    acc = candidate;
    if (acc.length > max * 0.55) break;
  }
  if (!acc) acc = cleaned;
  if (acc.length > max) acc = `${acc.slice(0, max - 1).trimEnd()}…`;
  return acc;
}

function parseTitle(md, name) {
  // `# ADR-XXXX: Title`
  let m = md.match(/^#\s+ADR-(\d{4})\s*:\s*(.+?)\s*$/m);
  if (m) return { id: m[1], title: m[2].trim() };
  // `# [ADR XXXX](...): Title`
  m = md.match(/^#\s+\[ADR[\s-]?(\d{4})\][^:]*:\s*(.+?)\s*$/m);
  if (m) return { id: m[1], title: m[2].trim() };
  // Generic `# ... XXXX ...: Title` fallback
  m = md.match(/^#\s+.*?(\d{4}).*?:\s*(.+?)\s*$/m);
  if (m) return { id: m[1], title: m[2].trim() };
  return { id: null, title: null };
}

function parseAdr(file) {
  const md = readFileSync(file.path, 'utf8');

  const parsed = parseTitle(md, file.name);
  const idFromName = (file.name.match(/^(\d{4})-/) || [])[1];
  const id = parsed.id || idFromName;
  if (!id) throw new Error(`Cannot determine ADR id for ${file.path}`);
  const adrId = `ADR-${id}`;
  const title = parsed.title ||
    file.name.replace(/^\d{4}-/, '').replace(/\.md$/, '')
      .replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Status: prefer dedicated section first line, else inline label, else Unknown.
  let statusSection = extractSection(md, /^Status$/i);
  let status = (statusSection.split('\n').find((l) => l.trim()) || '').trim();
  if (!status || /^\*\*/.test(status)) status = inlineLabel(md, 'Status') || status;
  status = status.replace(/[*_`]/g, '').trim() || 'Unknown';

  // Date: dedicated section, else inline label.
  let dateSection = extractSection(md, /^Date$/i);
  let date = (dateSection.split('\n').find((l) => l.trim()) || '').trim();
  if (!date || /^\*\*/.test(date)) date = inlineLabel(md, 'Date') || date;
  date = date.replace(/[*_`]/g, '').trim();

  // Decision: try several heading variants.
  let decision = '';
  for (const re of [
    /^Decision\s+and\s+Rationale$/i,
    /^Decision\s+and\s+Justification$/i,
    /^Decisions?$/i,
    /^(Strategic|Technical|Architectural)\s+Decisions?$/i,
    /^Decision\b.*$/i,
    /\bDecisions?\b/i,
  ]) {
    decision = extractSection(md, re);
    if (decision) break;
  }
  const decisionSummary = firstMeaningfulSentence(decision);

  return {
    ...file, id, adrId, title, status, date, decision, decisionSummary, md,
    key: `${file.track}-${id}`,
  };
}

/** Build the set of track-id keys already covered by handcrafted rulesets. */
function handcraftedKeys() {
  const keys = new Set();
  if (!existsSync(HANDCRAFTED_DIR)) return keys;
  for (const name of readdirSync(HANDCRAFTED_DIR)) {
    if (!name.endsWith('.rules.json')) continue;
    const json = JSON.parse(readFileSync(join(HANDCRAFTED_DIR, name), 'utf8'));
    const refs = Array.isArray(json.references) ? json.references : [];
    const primary = refs[0];
    if (primary) {
      const m = primary.match(/adrs\/([^/]+)\/(\d{4})-/);
      if (m) { keys.add(`${m[1]}-${m[2]}`); continue; }
    }
    const idm = (json.adrId || '').match(/(\d{4})/);
    if (idm) keys.add(`*-${idm[1]}`);
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Classification & ruleset construction
// ---------------------------------------------------------------------------

function classify(adr) {
  const haystack = `${adr.title}\n${adr.decision}`.toLowerCase();
  const hits = EXECUTABLE_SIGNALS.filter((sig) => haystack.includes(sig));
  const isExecutable = hits.length >= 2;
  return { enforcement: isExecutable ? 'executable' : 'advisory', signals: hits };
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function ruleIdPrefix(adr) {
  const trackCode = { core: 'CORE', nodejs: 'NODE', dotnet: 'DOT', 'ai-augmented': 'AI', android: 'AND' }[adr.track] || 'ADR';
  return `${trackCode}-${adr.id}`;
}

function buildRuleset(adr) {
  const { enforcement, signals } = classify(adr);
  const slug = slugify(adr.title);
  const fileSlug = `adr-${adr.track === 'core' ? '' : adr.track + '-'}${adr.id}-${slug}`.replace(/--+/g, '-');
  const fileName = `${fileSlug}.rules.json`;
  const prefix = ruleIdPrefix(adr);

  const decisionRef = adr.decisionSummary
    ? `ADR decision: ${adr.decisionSummary}`
    : `See ${adr.adrId} (${adr.track}) "Decision" section.`;

  const rules = [];

  if (enforcement === 'executable') {
    const signalList = signals.slice(0, 6).join(', ');
    rules.push({
      id: `${prefix}-01`,
      severity: 'MUST',
      category: 'adr-conformance',
      title: `Conform to ${adr.adrId}: ${adr.title}`,
      description:
        `Implementations MUST conform to the decision recorded in ${adr.adrId} ` +
        `(${adr.track} track). ${decisionRef} This ADR contains enforceable language ` +
        `(${signalList}); conformance is expected to be verifiable via static analysis, ` +
        `linting, CI gates, or structural checks.`,
      statement: decisionRef,
      rationale: `Derived from ${adr.adrId} "Decision" section. Enforcement signals detected: ${signalList}.`,
      validationQuery:
        `Verify codebase/CI compliance with ${adr.adrId} via static analysis, lint rules, ` +
        `or pipeline gates covering: ${signalList}. Concrete checks to be wired into the harness.`,
      blocking: true,
      enforcement: 'executable',
    });
  } else {
    rules.push({
      id: `${prefix}-01`,
      severity: 'SHOULD',
      category: 'adr-conformance',
      title: `Honor design decision in ${adr.adrId}: ${adr.title}`,
      description:
        `Design and implementation SHOULD honor the decision recorded in ${adr.adrId} ` +
        `(${adr.track} track). ${decisionRef} Manual attestation required — not machine-verifiable.`,
      statement: decisionRef,
      rationale: `Derived from ${adr.adrId} "Decision" section. No machine-verifiable signals detected; treated as an advisory design decision.`,
      blocking: false,
      enforcement: 'advisory',
    });
  }

  const ruleset = {
    $schema: SCHEMA_REL_FROM_GENERATED,
    $id: `https://evolith.dev/rulesets/adr/generated/${fileName}`,
    title: `${adr.adrId} — ${adr.title} Rules (generated)`,
    description:
      `Auto-generated ruleset encoding ${adr.adrId} (${adr.track} track). ` +
      `Classification: ${enforcement}. Generated by .harness/scripts/generate-adr-rulesets.mjs — do not edit by hand.`,
    version: '1.0.0',
    adrId: adr.adrId,
    adrTitle: adr.title,
    status: adr.status,
    date: adr.date,
    rules,
    references: [relative(REPO_ROOT, adr.path).split('\\').join('/')],
  };
  if (adr.date && /^\d{4}-\d{2}-\d{2}$/.test(adr.date)) ruleset.effectiveDate = adr.date;

  return { fileName, ruleset, enforcement };
}

/**
 * Build a deterministic, schema-valid "superseded" stub for a stale generated file.
 * The runtime cannot delete files, so orphaned outputs (e.g. left over after an ADR
 * title/slug change) are rewritten to this canonical stub instead of being removed.
 * Content is fully deterministic, so --check round-trips cleanly.
 */
function buildOrphanStub(fileName, current) {
  return {
    $schema: SCHEMA_REL_FROM_GENERATED,
    $id: `https://evolith.dev/rulesets/adr/generated/${fileName}`,
    title: `SUPERSEDED — ${fileName}`,
    description:
      `This generated ruleset filename is stale (the source ADR's title/slug changed). ` +
      `It has been superseded by \`rulesets/adr/generated/${current}\`. ` +
      `The runtime cannot delete files; this stub is regenerated deterministically. Safe to remove manually.`,
    version: '0.0.0',
    status: 'Superseded',
    rules: [
      {
        id: 'SUPERSEDED-01',
        severity: 'INFO',
        category: 'maintenance',
        title: 'Stale generated artifact',
        description: `Superseded by ${current}. No active rules. Manual deletion recommended.`,
        enforcement: 'advisory',
        blocking: false,
      },
    ],
  };
}

function serialize(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function generate() {
  const adrs = listAdrFiles().map(parseAdr);
  const covered = handcraftedKeys();

  const targets = [];
  let executable = 0, advisory = 0, handcrafted = 0;

  for (const adr of adrs) {
    if (covered.has(adr.key) || covered.has(`*-${adr.id}`)) { handcrafted++; continue; }
    const built = buildRuleset(adr);
    targets.push({ adr, ...built });
    if (built.enforcement === 'executable') executable++; else advisory++;
  }

  return { adrs, targets, covered, totals: { total: adrs.length, executable, advisory, handcrafted } };
}

function run() {
  const check = process.argv.includes('--check');
  const { targets, totals } = generate();

  if (!check) mkdirSync(GENERATED_DIR, { recursive: true });

  let drift = 0;
  const expected = new Set(targets.map((t) => t.fileName));
  for (const t of targets) {
    const outPath = join(GENERATED_DIR, t.fileName);
    const content = serialize(t.ruleset);
    if (check) {
      if (!existsSync(outPath)) {
        console.error(`[drift] missing generated ruleset: rulesets/adr/generated/${t.fileName}`);
        drift++; continue;
      }
      if (readFileSync(outPath, 'utf8') !== content) {
        console.error(`[drift] content differs: rulesets/adr/generated/${t.fileName}`);
        drift++;
      }
    } else {
      writeFileSync(outPath, content);
    }
  }

  // Handle orphans: stale generated files no longer produced (cannot delete -> rewrite to stub).
  let orphanCount = 0;
  if (existsSync(GENERATED_DIR)) {
    // Map adr-id -> first current filename, to point each stub at a sensible successor.
    const byId = new Map();
    for (const t of targets) {
      const m = t.fileName.match(/(\d{4})/);
      if (m && !byId.has(m[1])) byId.set(m[1], t.fileName);
    }
    for (const f of readdirSync(GENERATED_DIR)) {
      if (!f.endsWith('.rules.json') || expected.has(f)) continue;
      orphanCount++;
      const m = f.match(/(\d{4})/);
      const current = (m && byId.get(m[1])) || f;
      const stubContent = serialize(buildOrphanStub(f, current));
      const outPath = join(GENERATED_DIR, f);
      if (check) {
        if (readFileSync(outPath, 'utf8') !== stubContent) {
          console.error(`[drift] stale orphan not stubbed: rulesets/adr/generated/${f}`);
          drift++;
        }
      } else {
        writeFileSync(outPath, stubContent);
      }
    }
  }

  console.log('--- ADR ruleset coverage summary ---');
  console.log(`Total ADRs           : ${totals.total}`);
  console.log(`Handcrafted (skipped): ${totals.handcrafted}`);
  console.log(`Generated executable : ${totals.executable}`);
  console.log(`Generated advisory   : ${totals.advisory}`);
  console.log(`Generated total      : ${totals.executable + totals.advisory}`);
  const coverage = totals.total === 0 ? 0 :
    ((totals.handcrafted + totals.executable + totals.advisory) / totals.total) * 100;
  console.log(`Coverage             : ${coverage.toFixed(1)}%`);
  if (orphanCount) console.log(`Stale orphan stubs   : ${orphanCount} (rewritten as SUPERSEDED; delete manually)`);

  if (check) {
    if (drift > 0) {
      console.error(`\n[FAIL] ${drift} file(s) drifted or missing. Run the generator and commit the result.`);
      process.exit(1);
    }
    console.log('\n[OK] --check passed: no drift, all ADRs covered.');
  } else {
    console.log(`\n[OK] Wrote ${targets.length} generated ruleset(s) to rulesets/adr/generated/`);
  }
}

export { generate, buildRuleset, classify, parseAdr, listAdrFiles, handcraftedKeys, serialize, REPO_ROOT, GENERATED_DIR };

const invokedDirectly = process.argv[1] && (
  process.argv[1] === __filename || basename(process.argv[1]) === basename(__filename)
);
if (invokedDirectly) run();
