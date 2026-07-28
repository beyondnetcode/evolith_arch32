#!/usr/bin/env node

/**
 * GT-424 — negative fixtures for the skill-registry parity guard.
 *
 * The row was closed on 2026-07-04 against a guard that only checked
 * `DEFAULT_SKILLS ⊆ manifest.yaml`. Nobody had ever seen it fail on the
 * divergence it was named for, because in that direction the divergence is
 * invisible: a `DEFAULT_SKILLS` that declares nothing is a perfect subset. Each
 * test here is a fixture in which the guard MUST go red, and the first one is
 * the exact shape the audit measured on 2026-07-27.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(__dirname, '34-check-skill-registry-parity.mjs');
const REAL_ROOT = resolve(__dirname, '../../..');

let sandbox;

const SKILLS_JSON = JSON.stringify({ skills: [] }, null, 2);

/**
 * @param {string} name
 * @param {{ manifest?: string, skillsJson?: string, defaultSkills?: string,
 *           catalog?: string, catalogCaller?: string }} files
 */
function fixture(name, files = {}) {
  const root = join(sandbox, name);
  mkdirSync(join(root, '.harness'), { recursive: true });
  mkdirSync(join(root, 'reference/core/foundations/agent-skills'), { recursive: true });
  mkdirSync(join(root, 'src/packages/agent-runtime/src/adapters/skills'), { recursive: true });

  if (files.manifest !== undefined) {
    writeFileSync(join(root, '.harness/manifest.yaml'), files.manifest);
  }
  writeFileSync(
    join(root, 'reference/core/foundations/agent-skills/manifest.json'),
    files.skillsJson ?? SKILLS_JSON,
  );
  if (files.defaultSkills !== undefined) {
    writeFileSync(
      join(root, 'src/packages/agent-runtime/src/adapters/skills/default-skills.ts'),
      files.defaultSkills,
    );
  }
  if (files.catalog !== undefined) {
    writeFileSync(
      join(root, 'src/packages/agent-runtime/src/adapters/skills/manifest-skill-catalog.ts'),
      files.catalog,
    );
    // A derivation nothing calls routes nothing, so the guard demands a caller.
    // Fixtures that want the derivation CREDITED must supply one.
    if (files.catalogCaller !== undefined) {
      writeFileSync(
        join(root, 'src/packages/agent-runtime/src/adapters/skills/manifest-skill-registry.adapter.ts'),
        files.catalogCaller,
      );
    }
  }
  return root;
}

function run(root, extra = []) {
  const res = spawnSync(process.execPath, [GUARD, '--root', root, ...extra], {
    encoding: 'utf8',
    timeout: 60000,
  });
  return { status: res.status, out: `${res.stdout}\n${res.stderr}` };
}

const MANIFEST_TWO_EXECUTABLE = `version: 1

capabilities:
  - name: alpha-validator
    type: validator
    entry: .harness/playbooks/alpha.mjs
    runner: node

  - name: beta-skill
    type: skill
    entry: .harness/scripts/skills/beta.mjs
    runner: node
`;

const skillsTs = (...caps) => `
import type { SkillDescriptor } from '../../domain/contracts/capability';
export const DEFAULT_SKILLS: readonly SkillDescriptor[] = [
${caps
  .map(
    (c) => `  {
    id: '${c}-skill',
    intents: ['${c.replace(/-/g, '_')}'],
    kind: 'harness',
    harnessCapability: '${c}',
    permissions: ['read:repo'],
    requiresApproval: false,
    emitsTrace: true,
    requiresPolicy: false,
  },`,
  )
  .join('\n')}
];
`;

/**
 * GT-608's derivation, reduced to the three structural facts the guard checks:
 * exported synthesizer, unfiltered complement of `bound`, and a caller.
 */
const CATALOG_TOTAL = `
import { DEFAULT_SKILLS } from './default-skills';
function synthesize(capability) { return { id: capability.name }; }
export function deriveSkillsFromManifest(capabilities, base = DEFAULT_SKILLS) {
  const bound = new Set();
  const derived = base.map((s) => { if (s.harnessCapability) bound.add(s.harnessCapability); return s; });
  const synthesized = capabilities.filter((c) => !bound.has(c.name)).map(synthesize);
  return [...derived, ...synthesized];
}
`;

/** The same derivation with one extra predicate — coverage silently shrinks. */
const CATALOG_NARROWED = CATALOG_TOTAL.replace(
  'capabilities.filter((c) => !bound.has(c.name)).map(synthesize)',
  "capabilities.filter((c) => !bound.has(c.name) && c.type === 'validator').map(synthesize)",
);

const CATALOG_CALLER = `
import { deriveSkillsFromManifest } from './manifest-skill-catalog';
export class ManifestSkillRegistryAdapter {
  constructor(capabilities, base) { this.skills = deriveSkillsFromManifest(capabilities, base); }
}
`;

before(() => { sandbox = mkdtempSync(join(tmpdir(), 'gt424-parity-')); });
after(() => { if (sandbox) rmSync(sandbox, { recursive: true, force: true }); });

describe('34-check-skill-registry-parity', () => {
  test('R3: an executable capability no DEFAULT_SKILLS entry can reach turns it RED', () => {
    // THE reopened defect, in miniature: the manifest declares two capabilities
    // the adapter can spawn, DEFAULT_SKILLS routes one. Subset containment in
    // the old direction is perfect — 1 ⊆ 2 — and the agent still cannot invoke
    // half of what the harness knows how to run.
    const root = fixture('unrouted', {
      manifest: MANIFEST_TWO_EXECUTABLE,
      defaultSkills: skillsTs('alpha-validator'),
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /R3 — 1 executable capability is declared/);
    assert.match(out, /beta-skill/);
    assert.match(out, /bound by DEFAULT_SKILLS  1/);
    assert.match(out, /derivation NOT credited/);
  });

  // --- GT-608: the derivation is the mechanism, so the guard must audit IT ----

  test('R3: a live derivation is credited, and the synthesized half is reported as such', () => {
    // Same fixture as the RED case above — one of two capabilities hand-bound —
    // but with GT-608's derivation present and called. The capability IS
    // reachable, so failing here would demand a duplicate descriptor that
    // changes nothing a caller can observe.
    const root = fixture('derived', {
      manifest: MANIFEST_TWO_EXECUTABLE,
      defaultSkills: skillsTs('alpha-validator'),
      catalog: CATALOG_TOTAL,
      catalogCaller: CATALOG_CALLER,
    });
    const { status, out } = run(root);
    assert.equal(status, 0, out);
    assert.match(out, /routable, effective ........ 2\/2/);
    // The distinction must survive the green: a synthesized skill answers only
    // to its capability name, not to a natural intent. One number would hide it.
    assert.match(out, /bound by DEFAULT_SKILLS  1/);
    assert.match(out, /synthesized from manifest 1/);
  });

  test('R3: a derivation nothing calls is NOT credited', () => {
    const root = fixture('derivation-dead', {
      manifest: MANIFEST_TWO_EXECUTABLE,
      defaultSkills: skillsTs('alpha-validator'),
      catalog: CATALOG_TOTAL, // present, exported, and invoked by nobody
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /nothing in the package calls deriveSkillsFromManifest/);
    assert.match(out, /R3 — 1 executable capability is declared/);
  });

  test('R3: narrowing the synthesis with an extra predicate is NOT credited', () => {
    // The regression this whole check exists to catch: coverage shrinks by one
    // conjunct, every capability outside it goes quietly unreachable, and a
    // guard that trusted the derivation would stay green through it.
    const root = fixture('derivation-narrowed', {
      manifest: MANIFEST_TWO_EXECUTABLE,
      defaultSkills: skillsTs('alpha-validator'),
      catalog: CATALOG_NARROWED,
      catalogCaller: CATALOG_CALLER,
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /not the unfiltered complement/);
    assert.match(out, /beta-skill/);
  });

  test('full parity in both directions passes', () => {
    const root = fixture('parity', {
      manifest: MANIFEST_TWO_EXECUTABLE,
      defaultSkills: skillsTs('alpha-validator', 'beta-skill'),
    });
    const { status, out } = run(root);
    assert.equal(status, 0, out);
    assert.match(out, /resolve cleanly in BOTH directions/);
  });

  test('R2: a DEFAULT_SKILLS reference to an undeclared capability turns it RED', () => {
    const root = fixture('dangling-ref', {
      manifest: MANIFEST_TWO_EXECUTABLE,
      defaultSkills: skillsTs('alpha-validator', 'beta-skill', 'ghost-capability'),
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /R2 — DEFAULT_SKILLS references harnessCapability 'ghost-capability'/);
  });

  test('R1: a harness-backed agent skill with no manifest entry turns it RED', () => {
    const root = fixture('undeclared-entry', {
      manifest: MANIFEST_TWO_EXECUTABLE,
      defaultSkills: skillsTs('alpha-validator', 'beta-skill'),
      skillsJson: JSON.stringify(
        { skills: [{ id: 'orphan', file: '.harness/scripts/skills/orphan.mjs' }] },
        null,
        2,
      ),
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /R1 — Skill 'orphan' runs harness script/);
  });

  test('a runner the adapter cannot spawn is out of R3 scope', () => {
    // `runner: agent` is a markdown playbook read BY an agent. Requiring an
    // intent route to it would be a false positive, and hardcoding the exemption
    // by capability name is how the first version of this guard rotted — so the
    // exclusion is read from the manifest's own `runner` field.
    const root = fixture('agent-runner', {
      manifest: `${MANIFEST_TWO_EXECUTABLE}
  - name: some-playbook
    type: playbook
    entry: .harness/playbooks/some.md
    runner: agent
`,
      defaultSkills: skillsTs('alpha-validator', 'beta-skill'),
    });
    const { status, out } = run(root, ['--verbose']);
    assert.equal(status, 0, out);
    assert.match(out, /out of scope for R3/);
    assert.match(out, /some-playbook/);
  });

  test('a capability with no declared runner is treated as executable (fail-safe)', () => {
    // harness-manifest.ts:48 coerces an unknown/missing runner to `node`, so an
    // undeclared runner IS spawnable. Excluding it would be a hole.
    const root = fixture('no-runner', {
      manifest: `version: 1

capabilities:
  - name: alpha-validator
    type: validator
    entry: .harness/playbooks/alpha.mjs
    runner: node

  - name: runnerless
    type: skill
    entry: .harness/scripts/skills/runnerless.mjs
`,
      defaultSkills: skillsTs('alpha-validator'),
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /runnerless/);
  });

  test('--max-unrouted within budget exits 0 but refuses to call it a pass', () => {
    const root = fixture('ratchet-ok', {
      manifest: MANIFEST_TWO_EXECUTABLE,
      defaultSkills: skillsTs('alpha-validator'),
    });
    const { status, out } = run(root, ['--max-unrouted', '1']);
    assert.equal(status, 0, out);
    assert.match(out, /THIS IS NOT A PASS/);
  });

  test('--max-unrouted exceeded turns it RED', () => {
    const root = fixture('ratchet-blown', {
      manifest: `${MANIFEST_TWO_EXECUTABLE}
  - name: gamma-audit
    type: audit
    entry: .harness/playbooks/gamma.mjs
    runner: node
`,
      defaultSkills: skillsTs('alpha-validator'),
    });
    const { status, out } = run(root, ['--max-unrouted', '1']);
    assert.equal(status, 1, out);
    assert.match(out, /R3 — 2 executable capabilities are declared/);
  });

  test('vacuous: a manifest the line scanner cannot parse is RED, not "parity OK"', () => {
    const root = fixture('unparseable', {
      // `capabilities:` renamed — the scanner yields [] and every membership
      // test below it would then pass against empty sets.
      manifest: 'version: 1\n\nharnessCapabilities:\n  - name: alpha\n    runner: node\n',
      defaultSkills: skillsTs(),
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /ZERO capabilities parsed from the canonical manifest/);
  });

  test('vacuous: a DEFAULT_SKILLS with zero harnessCapability references is RED', () => {
    // This is the state the old guard passed on trivially: no references means
    // nothing to check in the ⊆ direction. It is a broken parser or an empty
    // routing layer, and neither is parity.
    const root = fixture('no-refs', {
      manifest: MANIFEST_TWO_EXECUTABLE,
      defaultSkills: 'export const DEFAULT_SKILLS = [];\n',
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /ZERO harnessCapability references in DEFAULT_SKILLS/);
  });

  test('a missing canonical manifest is RED', () => {
    const root = fixture('no-manifest', { defaultSkills: skillsTs() });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /canonical registry missing/);
  });

  test('the real repository: R3 is armed and measured', () => {
    // Deliberately budget-tolerant. The point is that the reverse direction is
    // computed against the real registries at all — the count itself is the
    // gap's remainder and lives in agent-runtime, not here.
    const { status, out } = run(REAL_ROOT, ['--max-unrouted', '99']);
    assert.equal(status, 0, out);
    assert.match(out, /routable, effective \.+ \d+\/\d+/);
    assert.match(out, /of those, executable/);
  });
});
