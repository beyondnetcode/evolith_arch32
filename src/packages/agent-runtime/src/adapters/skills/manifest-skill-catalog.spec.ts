/**
 * GT-608 — the skill catalogue is DERIVED from `.harness/manifest.yaml`.
 *
 * These assertions run against the REAL manifest on disk, not a fixture: the gap
 * is precisely that the two registries drifted, and a fixture would let them
 * drift again while the suite stayed green.
 */

import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

import { loadManifest } from '../harness/harness-manifest';
import { deriveSkillsFromManifest, intentsForCapability } from './manifest-skill-catalog';
import { ManifestSkillRegistryAdapter } from './manifest-skill-registry.adapter';
import { DEFAULT_SKILLS } from './default-skills';
import type { HarnessCapability } from '../../domain/contracts/capability';

/** `<repo>/.harness` from `src/packages/agent-runtime/src/adapters/skills`. */
const HARNESS_ROOT = resolve(__dirname, '../../../../../../.harness');

const capability = (over: Partial<HarnessCapability> = {}): HarnessCapability => ({
  name: 'cap',
  type: 'skill',
  description: 'a capability',
  entry: '.harness/scripts/skills/cap.mjs',
  permissions: ['read:repo'],
  requiresApproval: false,
  emitsTrace: true,
  requiresPolicy: false,
  ...over,
});

describe('deriveSkillsFromManifest (GT-608)', () => {
  it('synthesizes a routable skill for every capability no base skill binds', () => {
    const caps = [capability({ name: 'brand-new-capability' })];
    const skills = deriveSkillsFromManifest(caps, []);

    expect(skills).toHaveLength(1);
    expect(skills[0].id).toBe('brand-new-capability');
    expect(skills[0].kind).toBe('harness');
    expect(skills[0].harnessCapability).toBe('brand-new-capability');
    expect(skills[0].intents).toEqual(['brand_new_capability', 'brand-new-capability']);
  });

  it('lets the MANIFEST win on governance posture — a skill cannot de-escalate a capability', () => {
    const base = [
      {
        id: 'route-me',
        description: 'routing layer entry',
        intents: ['route_me'],
        kind: 'harness' as const,
        harnessCapability: 'cap',
        permissions: ['read:repo'],
        requiresApproval: false, // the routing layer says "no approval needed"…
        emitsTrace: true,
        requiresPolicy: false,
      },
    ];
    const skills = deriveSkillsFromManifest([capability({ requiresApproval: true })], base);

    // …the canonical registry says otherwise, and it wins.
    expect(skills).toHaveLength(1);
    expect(skills[0].id).toBe('route-me');
    expect(skills[0].requiresApproval).toBe(true);
    // Intent routing is still owned by the base skill.
    expect(skills[0].intents).toEqual(['route_me']);
  });

  it('leaves a pure Core-evaluation skill untouched (no manifest row governs it)', () => {
    const base = DEFAULT_SKILLS.filter((s) => !s.harnessCapability);
    expect(base.length).toBeGreaterThan(0);
    expect(deriveSkillsFromManifest([], base)).toEqual(base);
  });

  it('derives intents in both snake_case and the raw capability name', () => {
    expect(intentsForCapability('winston-audit')).toEqual(['winston_audit', 'winston-audit']);
    expect(intentsForCapability('opa')).toEqual(['opa']);
  });
});

describe('the real .harness/manifest.yaml (GT-608)', () => {
  const capabilities = existsSync(HARNESS_ROOT) ? loadManifest(HARNESS_ROOT) : [];

  it('is discoverable from this package (guards a path/refactor regression)', () => {
    expect(existsSync(HARNESS_ROOT)).toBe(true);
    // A hand-rolled path that silently resolves to nothing would make every
    // membership test below trivially pass against two empty sets.
    expect(capabilities.length).toBeGreaterThanOrEqual(16);
  });

  it('catalogue ⊇ manifest: every declared capability is routable by the agent', async () => {
    const registry = new ManifestSkillRegistryAdapter(capabilities);
    const skills = await registry.list();
    const boundCapabilities = new Set(
      skills.map((s) => s.harnessCapability).filter((c): c is string => Boolean(c)),
    );

    for (const cap of capabilities) {
      expect(boundCapabilities.has(cap.name)).toBe(true);
    }
  });

  it('every capability is RESOLVABLE — by a base skill that binds it, or by its own name', async () => {
    const registry = new ManifestSkillRegistryAdapter(capabilities);
    const boundByBase = new Map(
      DEFAULT_SKILLS.filter((s) => s.harnessCapability).map((s) => [s.harnessCapability as string, s.id]),
    );

    for (const cap of capabilities) {
      const baseId = boundByBase.get(cap.name);
      // A capability the routing table already binds resolves through that skill's
      // intents; one it does not resolves by its own name AND by its snake_case intent.
      const byTool = await registry.resolve('', baseId ?? cap.name);
      expect(byTool?.harnessCapability).toBe(cap.name);
      if (!baseId) {
        const byIntent = await registry.resolve(intentsForCapability(cap.name)[0]);
        expect(byIntent?.id).toBe(cap.name);
      }
    }
  });

  it('INVARIANT: an executable capability holding a write:* scope requires approval', () => {
    const offenders = capabilities
      .filter((c) => c.entry && c.permissions.some((p) => p.startsWith('write:')))
      .filter((c) => !c.requiresApproval)
      .map((c) => c.name);

    expect(offenders).toEqual([]);
  });

  it('at least two capabilities that mutate state declare requiresApproval: true', () => {
    const gated = capabilities.filter((c) => c.requiresApproval).map((c) => c.name);
    expect(gated.length).toBeGreaterThanOrEqual(2);
    // The executable one is the substance of GT-608: playbooks are prose, this runs.
    expect(gated).toContain('self-improving-loop');
  });

  it('surfaces approval-gated capabilities as approval-gated SKILLS (the seam the runtime reads)', async () => {
    const registry = new ManifestSkillRegistryAdapter(capabilities);
    const skills = await registry.list();
    const gatedSkills = skills.filter((s) => s.requiresApproval);

    // Before GT-608 this was the empty set — which is why ~1,000 LOC of approval
    // machinery had never executed.
    expect(gatedSkills.length).toBeGreaterThanOrEqual(2);
    expect(gatedSkills.map((s) => s.id)).toContain('self-improving-loop');
  });
});
