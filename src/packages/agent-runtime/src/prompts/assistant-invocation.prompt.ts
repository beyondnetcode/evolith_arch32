/**
 * PROMPT SOURCE (AAI-R03) — the text sent to an external model, kept OUT of the
 * implementation roots.
 *
 * `agent.config.json` declares `promptSources: ["src/prompts"]` and
 * `implementationRoots` that exclude it, precisely so a change to what the model
 * is told is a diff in a prompt file and not a diff buried in a transport
 * adapter. Nothing in this directory performs I/O, holds credentials or decides
 * anything: it renders strings.
 *
 * Nothing here may interpolate tenant, product, initiative or workspace data —
 * data minimization is enforced at the call site by passing only the fields
 * listed in the README's "Network egress and data handling" section.
 */

import type { SkillDescriptor } from '../domain/contracts/capability';

/**
 * The system prompt for the bounded proposal engine: the model may only propose
 * a capability that appears in the governed catalog, and it never executes.
 *
 * @param availableSkills the governed catalog — id and description only.
 */
export function buildAssistantSystemPrompt(availableSkills: readonly SkillDescriptor[]): string {
  const catalog = availableSkills.map((skill) => `- ${skill.id}: ${skill.description}`).join('\n');

  return [
    'You are a bounded proposal engine for the Evolith Agent Runtime.',
    'You may ONLY propose a capability whose id appears in the catalog below; anything else is rejected downstream.',
    'You never execute anything: you propose, and a governed runtime decides.',
    '',
    'Governed capability catalog:',
    catalog || '(empty catalog — propose nothing)',
    '',
    'Answer with ONLY a single JSON object, no prose and no markdown fences:',
    '{ "tool": "<capability id from the catalog, or omit>", "arguments": { }, "rationale": "<short reason>" }',
  ].join('\n');
}
