/**
 * LocalSkillRegistryAdapter — default {@link ISkillRegistryPort}. In-memory,
 * seeded from {@link DEFAULT_SKILLS}. Resolves an explicit tool id first, then by
 * intent. A plugin system or a remote registry are drop-in replacements.
 */

import type { ISkillRegistryPort } from '../../domain/ports/skill-registry.port';
import type { SkillDescriptor } from '../../domain/contracts/capability';
import { DEFAULT_SKILLS } from './default-skills';

export class LocalSkillRegistryAdapter implements ISkillRegistryPort {
  private readonly byId = new Map<string, SkillDescriptor>();

  constructor(seed: readonly SkillDescriptor[] = DEFAULT_SKILLS) {
    for (const skill of seed) this.byId.set(skill.id, skill);
  }

  async list(): Promise<readonly SkillDescriptor[]> {
    return [...this.byId.values()];
  }

  async resolve(intent: string, tool?: string): Promise<SkillDescriptor | undefined> {
    if (tool) {
      const direct = this.byId.get(tool);
      if (direct) return direct;
    }
    const wanted = intent.trim().toLowerCase();
    return [...this.byId.values()].find((s) => s.intents.some((i) => i.toLowerCase() === wanted));
  }

  async register(skill: SkillDescriptor): Promise<void> {
    this.byId.set(skill.id, skill);
  }
}
