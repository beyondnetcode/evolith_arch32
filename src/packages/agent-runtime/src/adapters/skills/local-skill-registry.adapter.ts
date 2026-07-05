/**
 * LocalSkillRegistryAdapter — default {@link ISkillRegistryPort}. In-memory,
 * seeded from {@link DEFAULT_SKILLS}. Resolves an explicit tool id first, then by
 * intent. A plugin system or a remote registry are drop-in replacements.
 */

import type { ISkillRegistryPort } from '../../domain/ports/skill-registry.port';
import type { SkillDescriptor } from '../../domain/contracts/capability';
import type { AgentSourceInterface } from '../../domain/contracts/agent-runtime-request';
import { DEFAULT_SKILLS } from './default-skills';

export class LocalSkillRegistryAdapter implements ISkillRegistryPort {
  private readonly byId = new Map<string, SkillDescriptor>();

  constructor(seed: readonly SkillDescriptor[] = DEFAULT_SKILLS) {
    for (const skill of seed) this.byId.set(skill.id, skill);
  }

  private isAllowed(skill: SkillDescriptor, sourceInterface?: AgentSourceInterface): boolean {
    if (!sourceInterface) return true;
    if (!skill.allowedSourceInterfaces) return true; // If not defined, assume all allowed
    return skill.allowedSourceInterfaces.includes(sourceInterface);
  }

  async list(sourceInterface?: AgentSourceInterface): Promise<readonly SkillDescriptor[]> {
    return [...this.byId.values()].filter(skill => this.isAllowed(skill, sourceInterface));
  }

  async resolve(intent: string, tool?: string, sourceInterface?: AgentSourceInterface): Promise<SkillDescriptor | undefined> {
    let matchedSkill: SkillDescriptor | undefined;
    if (tool) {
      matchedSkill = this.byId.get(tool);
    }
    
    if (!matchedSkill) {
      const wanted = intent.trim().toLowerCase();
      matchedSkill = [...this.byId.values()].find((s) => s.intents.some((i) => i.toLowerCase() === wanted));
    }
    
    if (matchedSkill && this.isAllowed(matchedSkill, sourceInterface)) {
      return matchedSkill;
    }
    
    return undefined;
  }

  async register(skill: SkillDescriptor): Promise<void> {
    this.byId.set(skill.id, skill);
  }
}
