#!/usr/bin/env node

/**
 * GT-424: Skill registry parity guard.
 *
 * Enforces the single source of truth across the three skill surfaces so they
 * cannot silently diverge:
 *
 *   1. `.harness/manifest.yaml`  — CANONICAL registry of executable harness
 *      capabilities (validators/audits/skills/playbooks). The runtime discovers
 *      and runs only what is declared here.
 *   2. `reference/core/foundations/agent-skills/manifest.json` — agent-facing
 *      metadata VIEW. Every skill whose implementation lives under
 *      `.harness/scripts/skills/` MUST map to a capability `entry` in (1).
 *   3. `DEFAULT_SKILLS` (agent-runtime `default-skills.ts`) — INTENT→capability
 *      routing layer. Every `harnessCapability` MUST resolve to a capability
 *      `name` in (1), AND every executable capability in (1) must be reachable
 *      from some entry in (3).
 *
 * ## Why the third check exists — GT-424 was closed while still broken
 *
 * This guard shipped on 2026-07-04 checking (3) ⊆ (1) and nothing else. Subset
 * containment in one direction is satisfied trivially by a `DEFAULT_SKILLS` that
 * declares almost nothing: seven skills, four of them harness-backed, against a
 * manifest of sixteen capabilities. Measured on 2026-07-27, that is exactly what
 * had happened — the guard was green, the row was DONE, and the agent could
 * route an intent to 4 of the 9 capabilities the harness can actually execute.
 * ADR-0102 names that drift as its principal risk.
 *
 * So the rule is now bidirectional, and the reverse direction is the one with
 * teeth:
 *
 *   R1  manifest.json harness-backed skill  ->  a manifest.yaml `entry`
 *   R2  DEFAULT_SKILLS `harnessCapability`  ->  a manifest.yaml `name`
 *   R3  manifest.yaml EXECUTABLE capability ->  some DEFAULT_SKILLS entry
 *
 * ## What "executable" means, and why it is derived rather than listed
 *
 * `HarnessProcessAdapter` dispatches on the `runner` field, and
 * `harness-manifest.ts:48` coerces anything that is not `opa` or `shell` into
 * `node`. The seven `runner: agent` playbooks are markdown read BY an agent, not
 * a process the adapter can spawn — running them as `node <file.md>` is what the
 * coercion would actually do. They are therefore out of scope for R3.
 *
 * That exclusion is computed from the manifest's own `runner` field, not from a
 * hand-maintained list here: the day a playbook becomes `runner: node`, R3
 * covers it with no edit to this file. A hardcoded exemption list is how the
 * first version of this guard rotted.
 *
 * ## Mode
 *
 * STRICT by default: any divergence is exit 1. `--max-unrouted <n>` is a ratchet
 * for wiring this into CI while the R3 remainder is repaired — the remainder is
 * a data change in `src/packages/agent-runtime/**`, not a change to this guard.
 * Under the ratchet the guard still prints the unrouted capabilities and says in
 * words that it is NOT a pass, following `41-validate-evidence-commands.mjs`.
 *
 * ## Anti-vacuous pass
 *
 * Every one of the three registries is parsed by a hand-rolled scanner over a
 * text file. Each parser's denominator is asserted: zero capabilities, or zero
 * `harnessCapability` references, means the parser broke, and every membership
 * test below would then "pass" against empty sets — parity reported across three
 * registries that were never compared.
 *
 * Usage:
 *   node .harness/scripts/ci/34-check-skill-registry-parity.mjs
 *   node .harness/scripts/ci/34-check-skill-registry-parity.mjs --verbose
 *   node .harness/scripts/ci/34-check-skill-registry-parity.mjs --max-unrouted 5
 *   node .harness/scripts/ci/34-check-skill-registry-parity.mjs --root <dir>
 *
 * Exit codes:
 *   0 - all three registries in parity (or within an explicit --max-unrouted)
 *   1 - divergence, a missing registry, or a vacuous parse
 */

import fs from "node:fs";
import path from "node:path";

// GT-556: root came from process.cwd(); from src/ the canonical registry resolved to
// src/.harness/manifest.yaml and the parity gate aborted.
import { REPO_ROOT } from '../lib/paths.mjs';
import { assertScanned, ZeroCoverageError } from '../lib/coverage.mjs';

const GUARD = '34-check-skill-registry-parity';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};

const VERBOSE = flag('--verbose');
const rootIdx = argv.indexOf('--root');
const root = rootIdx !== -1 ? path.resolve(process.cwd(), argv[rootIdx + 1]) : REPO_ROOT;
const MAX_UNROUTED = argv.includes('--max-unrouted') ? Number(opt('--max-unrouted', '0')) : null;

const issues = [];

const manifestYamlPath = path.join(root, ".harness/manifest.yaml");
const manifestJsonPath = path.join(
  root,
  "reference/core/foundations/agent-skills/manifest.json",
);
const defaultSkillsPath = path.join(
  root,
  "src/packages/agent-runtime/src/adapters/skills/default-skills.ts",
);

const catalogPath = path.join(
  root,
  "src/packages/agent-runtime/src/adapters/skills/manifest-skill-catalog.ts",
);

/**
 * Runners `HarnessProcessAdapter` can actually spawn. `agent` is deliberately
 * absent: a markdown playbook is read by an agent, not executed by the adapter.
 */
const EXECUTABLE_RUNNERS = new Set(['node', 'opa', 'shell']);

/**
 * GT-608 changed what R3 is allowed to conclude, and this guard was written
 * against the world before it.
 *
 * R3 asked "is every executable capability reachable from `DEFAULT_SKILLS`" and
 * treated a `no` as unreachable. That inference no longer holds:
 * `deriveSkillsFromManifest` now synthesizes a routable skill for every manifest
 * capability no base skill binds, so reachability is established BY CONSTRUCTION
 * and hand-written entries are an optimization, not the mechanism. Failing on
 * the hand-written count would demand five duplicate descriptors that change
 * nothing a caller can observe — and would in fact break the runtime, because a
 * base skill binding a capability suppresses its synthesized twin and renames
 * the id every existing caller targets.
 *
 * So the guard now measures the EFFECTIVE surface. What it must not do is take
 * the derivation on faith: if someone deletes it, stops calling it, or narrows
 * the synthesis with a predicate, capabilities go quietly unreachable again and
 * this guard would keep passing — the exact failure that got GT-424 reopened,
 * one layer up. Three structural facts are therefore checked, and all three must
 * hold before R3 credits the derivation:
 *
 *   1. the synthesizer is exported from `manifest-skill-catalog.ts`;
 *   2. some non-spec source in the package CALLS it (a derivation nothing
 *      invokes is dead code, and dead code routes nothing);
 *   3. the synthesis filters on the complement of `bound` and nothing else — an
 *      extra predicate silently shrinks coverage.
 *
 * When any of the three fails, R3 falls back to counting hand-written entries,
 * which is the correct answer in a world without a working derivation.
 */
function derivationCoversUnbound() {
  if (!fs.existsSync(catalogPath)) {
    return { total: false, why: `no ${path.relative(root, catalogPath)}` };
  }
  const src = fs.readFileSync(catalogPath, 'utf-8');

  if (!/export function deriveSkillsFromManifest\s*\(/.test(src)) {
    return { total: false, why: 'manifest-skill-catalog.ts exports no deriveSkillsFromManifest' };
  }

  // The synthesis must be the complement of `bound`, with no extra predicate.
  const filter = src.match(
    /capabilities\s*\.filter\(\s*\(\s*(\w+)\s*\)\s*=>\s*!bound\.has\(\s*\1\.name\s*\)\s*\)\s*\.map\(\s*synthesize\s*\)/,
  );
  if (!filter) {
    return {
      total: false,
      why: 'the synthesis is not the unfiltered complement of the bound capabilities',
    };
  }

  const callers = fs
    .readdirSync(path.dirname(catalogPath))
    .filter((f) => f.endsWith('.ts') && !f.includes('.spec.') && f !== 'manifest-skill-catalog.ts')
    .filter((f) =>
      /deriveSkillsFromManifest\s*\(/.test(
        fs.readFileSync(path.join(path.dirname(catalogPath), f), 'utf-8'),
      ),
    );
  if (callers.length === 0) {
    return { total: false, why: 'nothing in the package calls deriveSkillsFromManifest' };
  }

  return { total: true, callers };
}

/**
 * Minimal parser for the `.harness/manifest.yaml` capability list. The file is
 * flat, machine-generated-shaped YAML: each capability is a `  - name:` block at
 * 2-space indent with sibling keys at 4-space indent. We need `name`, `entry`,
 * `type` and `runner`, so a dependency-free line scan is sufficient.
 */
export function parseHarnessManifest(text) {
  const caps = [];
  let current = null;
  let inCapabilities = false;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (/^capabilities:\s*$/.test(line)) {
      inCapabilities = true;
      continue;
    }
    if (!inCapabilities) continue;
    // A new top-level key at column 0 ends the capabilities block.
    if (/^\S/.test(line)) {
      inCapabilities = false;
      continue;
    }

    const nameStart = line.match(/^\s*-\s+name:\s*(.+?)\s*$/);
    if (nameStart) {
      if (current) caps.push(current);
      current = { name: unquote(nameStart[1]), entry: null, type: null, runner: null };
      continue;
    }
    if (!current) continue;
    for (const key of ['entry', 'type', 'runner']) {
      const m = line.match(new RegExp(`^\\s+${key}:\\s*(.+?)\\s*$`));
      if (m && current[key] === null) current[key] = unquote(m[1]);
    }
  }
  if (current) caps.push(current);
  return caps;
}

function unquote(v) {
  return v.replace(/^['"]|['"]$/g, "").trim();
}

/**
 * A capability the runtime can spawn. `runner` is optional in the manifest and
 * the adapter defaults a missing/unknown value to `node`, so an undeclared
 * runner is treated as EXECUTABLE — failing safe, towards more coverage.
 */
export function isExecutable(cap) {
  if (!cap.runner) return true;
  return EXECUTABLE_RUNNERS.has(cap.runner);
}

// --- Load registries ---------------------------------------------------------

function main() {
  if (!fs.existsSync(manifestYamlPath)) {
    console.error(`✗ ${GUARD}: canonical registry missing: ${manifestYamlPath}`);
    process.exit(1);
  }

  const caps = parseHarnessManifest(fs.readFileSync(manifestYamlPath, "utf-8"));
  // GT-578: `parseHarnessManifest` is a hand-rolled line scanner. Change the
  // manifest's indentation, or rename `capabilities:`, and it returns [] — every
  // membership test below then trivially "passes" against two empty sets and the
  // guard reports parity across three registries it never compared.
  assertScanned(caps.length, {
    what: "capabilities parsed from the canonical manifest",
    where: manifestYamlPath,
  });
  const capNames = new Set(caps.map((c) => c.name).filter(Boolean));
  const capEntries = new Set(caps.map((c) => c.entry).filter(Boolean));
  const executable = caps.filter((c) => c.name && isExecutable(c));

  // --- R1: manifest.json harness-backed skills ⊆ manifest.yaml entries -------

  if (fs.existsSync(manifestJsonPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestJsonPath, "utf-8"));
    for (const skill of manifest.skills || []) {
      if (!skill.file) continue;
      const normalized = skill.file.replace(/^\.\//, "");
      if (!normalized.startsWith(".harness/scripts/skills/")) continue; // agent-local skill, not a harness capability
      if (!capEntries.has(normalized) && !capEntries.has(`./${normalized}`)) {
        issues.push(
          `R1 — Skill '${skill.id}' runs harness script '${skill.file}' but no .harness/manifest.yaml capability declares it as an 'entry'.`,
        );
      }
    }
  } else {
    issues.push(`R1 — agent-skills manifest missing: ${manifestJsonPath}`);
  }

  // --- R2/R3: DEFAULT_SKILLS ⇄ manifest.yaml ---------------------------------

  const derivation = derivationCoversUnbound();

  let routed = new Set();
  let unrouted = [];

  if (fs.existsSync(defaultSkillsPath)) {
    const src = fs.readFileSync(defaultSkillsPath, "utf-8");
    const refs = [...src.matchAll(/harnessCapability:\s*['"]([^'"]+)['"]/g)].map(
      (m) => m[1],
    );
    // A regex over TypeScript source is the same class of fragile parser as the
    // YAML line scanner above. Zero references means the shape changed — and
    // with zero references R2 passes trivially while R3 reports EVERY capability
    // as unrouted, which reads as a data problem rather than a broken guard.
    assertScanned(refs.length, {
      what: "harnessCapability references in DEFAULT_SKILLS",
      where: defaultSkillsPath,
    });

    for (const ref of refs) {
      if (!capNames.has(ref)) {
        issues.push(
          `R2 — DEFAULT_SKILLS references harnessCapability '${ref}' which is not declared as a capability 'name' in .harness/manifest.yaml.`,
        );
      }
    }
    routed = new Set(refs);

    // R3 — the reverse direction, and the reason GT-424 was reopened.
    // Measured against the EFFECTIVE routing surface, not `DEFAULT_SKILLS` alone:
    // see `derivationCoversUnbound()` for why, and for what makes the derivation
    // load-bearing rather than something this guard may simply assume.
    unrouted = derivation.total
      ? []
      : executable.filter((c) => !routed.has(c.name));
  } else {
    issues.push(`R2/R3 — default-skills.ts missing: ${defaultSkillsPath}`);
  }

  // --- Report ----------------------------------------------------------------

  console.log(`${GUARD} — parity across the three skill registries`);
  console.log(`  capabilities declared ...... ${capNames.size} (.harness/manifest.yaml)`);
  console.log(`  of those, executable ....... ${executable.length} (runner node|opa|shell — the adapter can spawn them)`);
  const handRouted = executable.filter((c) => routed.has(c.name)).length;
  console.log(`  routable, effective ........ ${executable.length - unrouted.length}/${executable.length}`);
  console.log(`    · bound by DEFAULT_SKILLS  ${handRouted} (named intents)`);
  if (derivation.total) {
    // Not a footnote: a synthesized skill answers only to its capability name
    // and the snake_case of it. `run_the_topology_audit` reaches a hand-bound
    // capability and reaches nothing here. Coverage is not the same as
    // discoverability, and a guard that printed one number would hide that.
    console.log(
      `    · synthesized from manifest ${executable.length - unrouted.length - handRouted} ` +
      `(reachable only as '<name>' / '<snake_name>')`,
    );
  } else {
    console.log(`    · derivation NOT credited: ${derivation.why}`);
  }

  if (VERBOSE) {
    console.log('\n  executable capabilities:');
    for (const c of executable) {
      console.log(`    ${routed.has(c.name) ? '✓' : '✗'} ${c.name} (${c.type ?? '?'} / ${c.runner ?? 'node'})`);
    }
    const nonExec = caps.filter((c) => c.name && !isExecutable(c));
    if (nonExec.length > 0) {
      console.log(`\n  out of scope for R3 (runner not spawnable by HarnessProcessAdapter):`);
      for (const c of nonExec) console.log(`    · ${c.name} (${c.type ?? '?'} / ${c.runner})`);
    }
    console.log('');
  }

  const withinRatchet = MAX_UNROUTED !== null && unrouted.length <= MAX_UNROUTED;

  if (unrouted.length > 0) {
    const lines = unrouted.map(
      (c) => `      • ${c.name} (${c.type ?? '?'} / ${c.runner ?? 'node'}) — ${c.entry ?? 'no entry'}`,
    );
    const detail =
      `R3 — ${unrouted.length} executable capabilit${unrouted.length === 1 ? 'y is' : 'ies are'} declared in ` +
      `.harness/manifest.yaml but reachable from no DEFAULT_SKILLS entry, so no intent can route to ` +
      `${unrouted.length === 1 ? 'it' : 'them'}:\n${lines.join('\n')}\n` +
      `      Fix: add a SkillDescriptor with \`harnessCapability: '<name>'\` in\n` +
      `      src/packages/agent-runtime/src/adapters/skills/default-skills.ts — or, if the\n` +
      `      capability is genuinely not agent-facing, change its \`runner\` in the manifest\n` +
      `      so it stops claiming to be something the adapter can spawn.`;
    if (withinRatchet) {
      console.log('');
      console.log(`  ⚠ THIS IS NOT A PASS — ${unrouted.length} unrouted, within the explicit --max-unrouted ${MAX_UNROUTED} budget.`);
      console.log(`  ${detail.split('\n').join('\n  ')}`);
      console.log(`  Lower the budget as capabilities are routed; at 0, drop the flag.`);
    } else {
      issues.push(detail);
    }
  }

  if (issues.length > 0) {
    console.error('');
    console.error(`✗ ${GUARD}: skill registry parity FAILED — ${issues.length} divergence(s):`);
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exit(1);
  }

  console.log('');
  console.log(
    `✓ ${GUARD}: ${capNames.size} capabilities declared; manifest.json and DEFAULT_SKILLS resolve cleanly ` +
    `in BOTH directions${withinRatchet ? ' (within the declared unrouted budget)' : ''}.`,
  );
  process.exit(0);
}

try {
  main();
} catch (error) {
  if (error instanceof ZeroCoverageError) {
    console.error(`\n✗ ${GUARD}: ${error.message}`);
    process.exit(1);
  }
  console.error(`\n✗ ${GUARD} crashed: ${error?.stack || error}`);
  process.exit(1);
}
