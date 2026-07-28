/**
 * GT-608 — derive the skill catalogue from `.harness/manifest.yaml`.
 *
 * Before this, {@link DEFAULT_SKILLS} was the ONLY thing the runtime could route
 * to: seven hardcoded entries, none of which required approval. The manifest —
 * the canonical registry of executable capabilities and their governance posture
 * (ADR-0102, design rule #4) — was read by the harness EXECUTOR but never by the
 * REGISTRY, so nine declared capabilities were invisible to the agent and the
 * governance posture had two sources of truth. That drift is the principal risk
 * ADR-0102 names, and it is what made the whole HITL subsystem unreachable: the
 * only capabilities declaring `requiresApproval: true` live in the manifest.
 *
 * The merge rule is deliberately asymmetric, because the two registries answer
 * different questions:
 *
 *   · `DEFAULT_SKILLS` owns INTENT ROUTING — which natural intents resolve to a
 *     capability, which Core evaluation kinds it requests, its input contract.
 *   · `.harness/manifest.yaml` owns GOVERNANCE POSTURE — permissions, approval,
 *     trace, policy. When a skill binds a manifest capability, the manifest WINS
 *     on posture. A capability cannot be de-escalated by the routing layer.
 *
 * Every manifest capability that no skill binds is SYNTHESIZED into a harness
 * skill so the catalogue is a superset of the manifest by construction — that is
 * the invariant `manifest-skill-catalog.spec.ts` asserts against the real file.
 */

import type { HarnessCapability, SkillDescriptor } from '../../domain/contracts/capability';
import { DEFAULT_SKILLS } from './default-skills';

/**
 * Intents a synthesized skill answers to. Both the raw capability name and its
 * snake_case form, so `run_self_improving_loop`-style callers and tool-id callers
 * both land on the same governed capability.
 */
export function intentsForCapability(name: string): readonly string[] {
  const snake = name.replace(/-/g, '_');
  return snake === name ? [name] : [snake, name];
}

/** Lift a manifest capability's governance posture onto a skill, manifest-authoritative. */
function withManifestPosture(
  skill: SkillDescriptor,
  capability: HarnessCapability,
): SkillDescriptor {
  return {
    ...skill,
    permissions: capability.permissions,
    requiresApproval: capability.requiresApproval,
    emitsTrace: capability.emitsTrace,
    requiresPolicy: capability.requiresPolicy,
    // A skill may name a policy the manifest leaves implicit; never blank it out.
    policyRef: capability.policyRef ?? skill.policyRef,
  };
}

/** Synthesize a routable harness skill for a capability no base skill binds. */
function synthesize(capability: HarnessCapability): SkillDescriptor {
  return {
    id: capability.name,
    description: capability.description || `Harness capability '${capability.name}'.`,
    intents: intentsForCapability(capability.name),
    kind: 'harness',
    harnessCapability: capability.name,
    inputs: capability.inputs,
    permissions: capability.permissions,
    requiresApproval: capability.requiresApproval,
    emitsTrace: capability.emitsTrace,
    requiresPolicy: capability.requiresPolicy,
    policyRef: capability.policyRef,
  };
}

/**
 * Build the catalogue: base skills (posture re-derived from the manifest where
 * they bind one) followed by a synthesized skill per unbound capability.
 *
 * Deterministic and pure — declaration order is preserved so a catalogue diff is
 * readable. Base skills that bind nothing in `.harness` (pure Core evaluations)
 * pass through untouched: there is no manifest row that could govern them.
 */
export function deriveSkillsFromManifest(
  capabilities: readonly HarnessCapability[],
  base: readonly SkillDescriptor[] = DEFAULT_SKILLS,
): readonly SkillDescriptor[] {
  const byName = new Map(capabilities.map((c) => [c.name, c]));
  const bound = new Set<string>();

  const derived = base.map((skill) => {
    const capability = skill.harnessCapability ? byName.get(skill.harnessCapability) : undefined;
    if (!capability) return skill;
    bound.add(capability.name);
    return withManifestPosture(skill, capability);
  });

  const synthesized = capabilities.filter((c) => !bound.has(c.name)).map(synthesize);
  return [...derived, ...synthesized];
}
