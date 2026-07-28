/**
 * GT-608 — {@link ISkillRegistryPort} seeded from `.harness/manifest.yaml`.
 *
 * Composition, not inheritance: it derives the catalogue
 * ({@link deriveSkillsFromManifest}) and delegates resolution to the same
 * {@link LocalSkillRegistryAdapter} everything else already uses, so intent /
 * tool / source-interface semantics stay in ONE place.
 *
 * Not the bootstrap default on purpose: design rule #5 says the runtime boots
 * with no `.harness` checkout, and reading a file at boot would break that. Wire
 * it explicitly (or pass `harnessRoot` to `createAgentRuntime`) alongside the
 * `HarnessProcessAdapter` that actually executes what the manifest declares.
 */

import type { ISkillRegistryPort } from '../../domain/ports/skill-registry.port';
import type { SkillDescriptor, HarnessCapability } from '../../domain/contracts/capability';
import type { AgentSourceInterface } from '../../domain/contracts/agent-runtime-request';
import { LocalSkillRegistryAdapter } from './local-skill-registry.adapter';
import { deriveSkillsFromManifest } from './manifest-skill-catalog';
import { loadManifest } from '../harness/harness-manifest';
import { DEFAULT_SKILLS } from './default-skills';

export class ManifestSkillRegistryAdapter implements ISkillRegistryPort {
  private readonly inner: LocalSkillRegistryAdapter;

  constructor(
    capabilities: readonly HarnessCapability[],
    base: readonly SkillDescriptor[] = DEFAULT_SKILLS,
  ) {
    this.inner = new LocalSkillRegistryAdapter(deriveSkillsFromManifest(capabilities, base));
  }

  /** Read `<harnessRoot>/manifest.yaml` from disk and build the registry from it. */
  static fromHarnessRoot(
    harnessRoot: string,
    base: readonly SkillDescriptor[] = DEFAULT_SKILLS,
  ): ManifestSkillRegistryAdapter {
    return new ManifestSkillRegistryAdapter(loadManifest(harnessRoot), base);
  }

  list(sourceInterface?: AgentSourceInterface): Promise<readonly SkillDescriptor[]> {
    return this.inner.list(sourceInterface);
  }

  resolve(
    intent: string,
    tool?: string,
    sourceInterface?: AgentSourceInterface,
  ): Promise<SkillDescriptor | undefined> {
    return this.inner.resolve(intent, tool, sourceInterface);
  }

  register(skill: SkillDescriptor): Promise<void> {
    return this.inner.register(skill);
  }
}
