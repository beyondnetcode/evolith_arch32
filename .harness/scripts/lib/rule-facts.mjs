/**
 * GT-716 AC2 — the declared facts of the rule corpus, and the one question the OPA
 * side has to answer against them: does a policy read a facet its rule never declared?
 *
 * The declaration lives in each rule (`facts: ["satellite.multiTenancy", …]`, ids from
 * `src/rulesets/schema/facets.json`). This module reads the corpus the way the loaders
 * do — `rules` or `principles`, one object per id — and is dependency-free so that
 * `compile-opa-wasm.mjs` can refuse to build a bundle whose policies read facts the
 * rules did not declare, and the unit test can prove the refusal.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** The FACET of an `input.…` path — same rule as `facetOfInputPath` in `opa-evaluator.ts`. */
export function facetOfInputPath(path) {
  const segments = path.split('.');
  if (segments[0] !== 'input' || segments.length < 2) return null;
  if (segments[1] === 'satellite' || segments[1] === 'core') {
    return segments.length >= 3 ? segments.slice(1, 3).join('.') : null;
  }
  return segments[1];
}

/** Every `*.rules.json` under a root, sorted, skipping the Spanish twins. */
export function rulesetFiles(root) {
  const out = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (entry.endsWith('.rules.json') && !entry.endsWith('.rules.es.json')) out.push(full);
    }
  })(root);
  return out;
}

/** The rule objects of one parsed ruleset document, or [] when it is not a ruleset. */
export function rulesOf(parsed) {
  const list = parsed?.rules ?? parsed?.principles;
  if (!Array.isArray(list)) return [];
  if (list.length > 0 && !list[0]?.id && list[0]?.rules) return [];
  return list.filter((r) => r && typeof r === 'object' && r.id);
}

/**
 * @returns {Map<string, {facts: string[] | null, file: string}>} rule id → declared facets
 *   (`null` when the rule declares none at all, which is different from `[]`).
 */
export function readCorpusFacts(rulesetsRoot, repoRoot = rulesetsRoot) {
  const out = new Map();
  for (const file of rulesetFiles(rulesetsRoot)) {
    let parsed;
    try { parsed = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
    for (const rule of rulesOf(parsed)) {
      out.set(String(rule.id), {
        facts: Array.isArray(rule.facts) ? rule.facts.map(String) : null,
        file: relative(repoRoot, file),
      });
    }
  }
  return out;
}

export function readVocabulary(repoRoot) {
  const doc = JSON.parse(readFileSync(join(repoRoot, 'src', 'rulesets', 'schema', 'facets.json'), 'utf8'));
  return new Map(Object.entries(doc.facets ?? {}));
}

/**
 * The findings the bundle build refuses on.
 *
 * @param {Map<string, string[]>} reads rule id → `input.…` paths its policies read
 * @param {Map<string, {facts: string[]|null, file: string}>} corpus from readCorpusFacts
 * @param {Map<string, object>} vocabulary from readVocabulary
 * @returns {string[]} one line per finding; empty when every read is declared
 */
export function undeclaredReads(reads, corpus, vocabulary) {
  const findings = [];
  for (const [id, paths] of [...reads.entries()].sort()) {
    const rule = corpus.get(id);
    // A gate id (`opa-<file>`) or a policy-only id (PG-*, CB-*) is not a corpus rule;
    // the corpus cannot declare for it and the evaluator's schema check governs it.
    if (!rule) continue;
    const facets = [...new Set(paths.map(facetOfInputPath).filter(Boolean))].sort();
    if (rule.facts === null) {
      findings.push(`${id} (${rule.file}) declares no \`facts\` at all, and its policy reads ${facets.join(', ') || 'nothing'}.`);
      continue;
    }
    const declared = new Set(rule.facts);
    const missing = facets.filter((f) => !declared.has(f));
    if (missing.length > 0) {
      findings.push(`${id} (${rule.file}) reads ${missing.join(', ')} which its \`facts\` (${rule.facts.join(', ') || 'none'}) do not declare.`);
    }
    for (const f of facets.filter((f) => !vocabulary.has(f))) {
      findings.push(`${id} reads \`${f}\`, a facet \`src/rulesets/schema/facets.json\` does not know.`);
    }
  }
  return findings;
}

/**
 * Vocabulary entries nothing uses: declared by no corpus rule AND read by no policy.
 * A facet nobody names is a provenance nobody derives from — dead vocabulary, which
 * is how a table rots into permission. The build refuses it.
 */
export function staleVocabulary(vocabulary, corpus, reads) {
  const used = new Set();
  for (const { facts } of corpus.values()) for (const facet of facts ?? []) used.add(facet);
  for (const paths of reads.values()) for (const path of paths) { const facet = facetOfInputPath(path); if (facet) used.add(facet); }
  return [...vocabulary.keys()].filter((facet) => !used.has(facet)).sort();
}
