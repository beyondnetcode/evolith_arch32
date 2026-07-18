/**
 * Automation-candidate assessment (ADR-0115, ADR-0097) — the last leg of
 * Conversation -> Knowledge -> Pattern -> Rule -> Automation.
 *
 * The gate itself already exists: OPA rule KI-R03 refuses `executable` promotion
 * unless a candidate carries an ADR, a native rule, an OPA policy and passing
 * fixtures. This module answers the question that comes BEFORE that gate — is
 * this piece of knowledge the kind of thing that should become a rule at all?
 *
 * THE POINT MOST EASILY MISSED
 *
 * Not everything worth knowing is worth automating. A rule that fires on
 * something requiring judgement produces false positives, and false positives
 * are not a nuisance — they are how a gate loses its authority. Once engineers
 * learn that a check is often wrong they route around every check, including the
 * correct ones. A wrong rule is therefore worse than no rule, and this assessor
 * is deliberately biased against proposing automation.
 *
 * It recommends, and nothing more. Per ADR-0097 only the Architecture Board
 * promotes to `executable`, and per ADR-0115 an agent may not turn an inference
 * into a rule.
 */

/** Lifecycle stage, mirroring ADR-0097 exactly. */
export type PromotionStatus = 'candidate' | 'evaluated' | 'accepted' | 'executable' | 'retired';

/** What the assessor was given about a piece of knowledge. */
export interface AutomationInput {
  readonly knowledgeId: string;
  readonly status: PromotionStatus;
  /** Distinct repositories where the pattern was observed. */
  readonly repositories: readonly string[];
  /** Total observations across all repositories. */
  readonly occurrences: number;
  /** Anti-patterns the entry declares — the concrete thing a rule would detect. */
  readonly antiPatterns: readonly string[];
  /**
   * Whether the finding can be decided from artefacts alone (AST, config, file
   * layout) without weighing context. This is the single most important input
   * and it cannot be inferred from counts: it is a human judgement recorded on
   * the entry.
   */
  readonly mechanicallyDetectable: boolean;
}

export type AutomationVerdict = 'propose-rule' | 'keep-observing' | 'not-automatable' | 'premature';

export interface AutomationAssessment {
  readonly verdict: AutomationVerdict;
  /** Reasons, in the order they were decided. Suitable for a review comment. */
  readonly reasons: readonly string[];
  /** Repositories that evidenced the pattern; breadth is the maturity signal. */
  readonly breadth: number;
  /** True only when every precondition for proposing a rule holds. */
  readonly ready: boolean;
}

/**
 * How many distinct repositories must show a pattern before it is proposed as a
 * rule. Three is the smallest number that distinguishes a pattern from a
 * coincidence: two repositories can share an author, a template or a bad day.
 */
export const DEFAULT_BREADTH_THRESHOLD = 3;

export interface AssessOptions {
  readonly breadthThreshold?: number;
}

/**
 * Decides whether knowledge is ready to be proposed as an automated rule.
 *
 * The checks are ordered so the most disqualifying answer wins, and each returns
 * its own verdict rather than a score: "not automatable" and "too early" are
 * different situations calling for different follow-ups, and collapsing them
 * into one number would lose that.
 */
export function assessAutomationCandidate(
  input: AutomationInput,
  options: AssessOptions = {},
): AutomationAssessment {
  const threshold = options.breadthThreshold ?? DEFAULT_BREADTH_THRESHOLD;
  const breadth = new Set(input.repositories).size;
  const reasons: string[] = [];

  // 1. Judgement cannot be automated. This outranks every other signal: a
  //    pattern seen in twenty repositories is still not a rule if deciding it
  //    requires context a validator does not have.
  if (!input.mechanicallyDetectable) {
    reasons.push(
      'The finding is not decidable from artefacts alone. Automating it would produce false positives, and a check that is often wrong teaches engineers to route around every check.',
    );
    return { verdict: 'not-automatable', reasons, breadth, ready: false };
  }

  // 2. Nothing is automated before it is decided. ADR-0097 makes `accepted` the
  //    stage at which the Architecture Board has ruled; automating earlier would
  //    enforce an opinion as if it were a standard.
  if (input.status !== 'accepted') {
    reasons.push(
      `Status is "${input.status}". A rule may only be proposed from "accepted" knowledge — automating earlier would enforce an opinion the Board has not ratified.`,
    );
    return { verdict: 'premature', reasons, breadth, ready: false };
  }

  // 3. A rule needs something concrete to detect.
  if (input.antiPatterns.length === 0) {
    reasons.push(
      'The entry declares no anti-pattern, so there is nothing concrete for a validator to match. Describe what "wrong" looks like before proposing a rule.',
    );
    return { verdict: 'not-automatable', reasons, breadth, ready: false };
  }

  // 4. Breadth, not volume, is what distinguishes a pattern from a local habit.
  if (breadth < threshold) {
    reasons.push(
      `Observed in ${breadth} repository/ies (threshold ${threshold}). Fewer than ${threshold} cannot distinguish a shared pattern from a local habit — two repositories can share an author or a template.`,
    );
    return { verdict: 'keep-observing', reasons, breadth, ready: false };
  }

  reasons.push(
    `Accepted knowledge, mechanically detectable, declaring ${input.antiPatterns.length} anti-pattern(s), observed across ${breadth} repositories (${input.occurrences} occurrence(s)).`,
    'Recommend drafting a rule proposal. Per ADR-0097 the Architecture Board decides; KI-R03 will additionally require an ADR, a native rule, an OPA policy and passing fixtures before `executable`.',
  );
  return { verdict: 'propose-rule', reasons, breadth, ready: true };
}

/** Renders an assessment as a short review comment. */
export function formatAssessment(id: string, a: AutomationAssessment): string {
  const header: Record<AutomationVerdict, string> = {
    'propose-rule': `${id}: ready for a rule proposal`,
    'keep-observing': `${id}: keep observing`,
    'not-automatable': `${id}: not a candidate for automation`,
    premature: `${id}: too early to automate`,
  };
  return [header[a.verdict], ...a.reasons.map((r) => `- ${r}`)].join('\n');
}
