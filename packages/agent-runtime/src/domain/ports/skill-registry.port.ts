/**
 * ISkillRegistryPort — resolves an intent (or explicit tool id) to a governed
 * {@link SkillDescriptor}. This indirection is what lets `.harness`, the Core,
 * or a future engine back the same intent without changing callers.
 */

import type { SkillDescriptor } from '../contracts/capability';

import type { AgentSourceInterface } from '../contracts/agent-runtime-request';

export interface ISkillRegistryPort {
  /** Every registered skill (for CLI/chat listing), optionally filtered by interface. */
  list(sourceInterface?: AgentSourceInterface): Promise<readonly SkillDescriptor[]>;
  /**
   * Resolve by explicit tool id first, then by intent. Returns undefined when
   * nothing matches (the runtime turns that into a `status: 'error'`,
   * tool-not-found result). Optionally filtered by interface.
   */
  resolve(intent: string, tool?: string, sourceInterface?: AgentSourceInterface): Promise<SkillDescriptor | undefined>;
  /** Register/override a skill at runtime (e.g. from a plugin). */
  register(skill: SkillDescriptor): Promise<void>;
}
