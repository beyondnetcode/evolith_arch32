/**
 * The advisory-authority boundary (ADR-0101, ADR-0097, ADR-0115) — the single
 * place that decides who may *assert* something and who may *decide* it.
 *
 * Sixty-odd files in this repository restate this boundary in prose: "binding:
 * false", "advisory only", "recommends, does not decide". Prose cannot be
 * pointed at in a review and cannot refuse anything. This module exists so the
 * rule has one home, one wording, and a return value.
 *
 * THE POINT MOST EASILY MISSED
 *
 * The boundary is not about trusting agents less than people. It is about where
 * the *external check* lives. An agent that may ratify its own inference is
 * checked by nothing: the thing producing the claim and the thing certifying the
 * claim are the same process, so the certificate carries no information. The
 * same is true of an engine that could promote its own finding to a rule and
 * then enforce that rule — it would be grading its own homework in a loop, and
 * every subsequent evaluation would inherit the original mistake as if it were
 * a standard.
 *
 * That matters commercially, not just philosophically. Evolith governs other
 * people's architectures. A governance system whose checks self-authorize gives
 * the teams it governs no reason to accept a verdict they disagree with — the
 * only answer to "who decided this?" would be "the tool did". The refusals in
 * this module are what makes the answer a person.
 *
 * So: an agent, an engine, or CI may observe, recommend, attach evidence and
 * draft a candidate — an unbounded right, deliberately, because assertion is
 * cheap to retract. Accepting, promoting, ratifying, waiving and enforcing are
 * reserved to named human authority, because those acts confer institutional
 * weight and retracting them is expensive.
 *
 * WHAT THIS MODULE IS NOT
 *
 * It is not RBAC. `domain/rbac` answers "does this *person* hold the role a gate
 * requires?" — a question about which human. This module answers the prior
 * question: "is a human required here at all?" The two compose; neither
 * replaces the other.
 */

import { EvolithError } from './errors';

// ─── Actors ─────────────────────────────────────────────────────────────────

/**
 * The kinds of actor the boundary distinguishes.
 *
 * The split that matters is human vs non-human, but the human side is not one
 * thing: ADR-0097 assigns different stages to different offices, so `custodian`
 * and `board` are distinct kinds rather than roles carried on a generic human.
 */
export type ActorKind =
  /** An autonomous agent (ADR-0115). May assert; may never decide. */
  | 'agent'
  /** The Core evaluation engine itself (ADR-0101). Emits non-binding results. */
  | 'engine'
  /** A mechanical pipeline. Admits candidates; ratifies nothing. */
  | 'ci'
  /** An identified person holding no governance office. */
  | 'human'
  /** The knowledge lifecycle custodian — `@winston` per ADR-0097 §2. */
  | 'custodian'
  /** The Architecture Board — sole authority for `accepted` and `executable`. */
  | 'board';

export interface Actor {
  /** Stable identifier. Compared against `Artefact.authoredBy` for self-authorization. */
  readonly id: string;
  readonly kind: ActorKind;
}

/** Actor kinds that carry human accountability. Everything else may only assert. */
const HUMAN_KINDS: readonly ActorKind[] = ['human', 'custodian', 'board'];

/** True when the actor is a person or a body of people who can be held to account. */
export function isHumanAuthority(actor: Actor): boolean {
  return HUMAN_KINDS.includes(actor.kind);
}

// ─── Actions ────────────────────────────────────────────────────────────────

/**
 * Acts of assertion. Open to every actor, including agents.
 *
 * Each is a claim *about* the world that leaves the governed state untouched;
 * a wrong assertion is corrected by the next assertion.
 */
export type AssertiveAction =
  | 'observe'
  | 'recommend'
  | 'attach-evidence'
  | 'draft-candidate';

/**
 * Acts of authority. Each changes what the organisation is committed to, so
 * each requires a person who can be asked why.
 */
export type AuthoritativeAction =
  /** Move knowledge to `accepted` — ADR-0097 reserves this to the Board. */
  | 'accept'
  /** Advance a record along the promotion lifecycle. */
  | 'promote'
  /** Turn a non-binding recommendation into a binding decision (ADR-0101 §3). */
  | 'ratify'
  /** Excuse a violation. */
  | 'waive'
  /** Make a rule block. */
  | 'enforce';

export type AuthorityAction = AssertiveAction | AuthoritativeAction;

const ASSERTIVE_ACTIONS: readonly AuthorityAction[] = [
  'observe',
  'recommend',
  'attach-evidence',
  'draft-candidate',
];

export function isAssertive(action: AuthorityAction): action is AssertiveAction {
  return ASSERTIVE_ACTIONS.includes(action);
}

export function isAuthoritative(action: AuthorityAction): action is AuthoritativeAction {
  return !isAssertive(action);
}

// ─── Promotion lifecycle (ADR-0097 §1) ──────────────────────────────────────

export type PromotionStatus =
  | 'candidate'
  | 'evaluated'
  | 'accepted'
  | 'executable'
  | 'retired';

/**
 * The lifecycle, in order. Encoded as data rather than prose so the sequencing
 * rule ("a candidate must not skip a stage") is checked, not remembered.
 */
export const PROMOTION_SEQUENCE: readonly PromotionStatus[] = [
  'candidate',
  'evaluated',
  'accepted',
  'executable',
];

/**
 * Who may move a record *into* each stage — ADR-0097 §1's custodian column.
 *
 * `candidate` is open: admitting a draft is an assertion, and ADR-0115 states
 * explicitly that an agent may draft a `KO-*` at `candidate`. Everything above
 * it narrows, and `accepted`/`executable` narrow to the Board alone.
 */
export const PROMOTION_AUTHORITY: Readonly<Record<PromotionStatus, readonly ActorKind[]>> = {
  candidate: ['agent', 'engine', 'ci', 'human', 'custodian', 'board'],
  evaluated: ['custodian', 'board'],
  accepted: ['board'],
  executable: ['board'],
  // Disposition of a rejected or superseded record is the custodian's
  // responsibility (ADR-0097 §2); the Board may of course also retire.
  retired: ['custodian', 'board'],
};

/** Terminal states admit no further promotion. */
const TERMINAL_STATUSES: readonly PromotionStatus[] = ['retired'];

/**
 * Whether `from → to` is a shape the lifecycle allows, ignoring who is asking.
 * Authority is a separate question, answered by `evaluateAuthority`.
 */
export function isValidPromotion(from: PromotionStatus, to: PromotionStatus): boolean {
  if (TERMINAL_STATUSES.includes(from)) return false;
  if (to === 'retired') return true;
  const fromIndex = PROMOTION_SEQUENCE.indexOf(from);
  const toIndex = PROMOTION_SEQUENCE.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex === fromIndex + 1;
}

// ─── The artefact under consideration ───────────────────────────────────────

export interface Artefact {
  readonly id: string;
  /**
   * Free-form kind label ('KO-record', 'gate-decision', 'violation'…). The
   * boundary does not vary by artefact kind; the field exists so a refusal
   * reason names the thing a reviewer is looking at.
   */
  readonly kind: string;
  /** Actor id that produced it. Drives the self-authorization refusal. */
  readonly authoredBy?: string;
  /** Current lifecycle stage, when the artefact has one. */
  readonly status?: PromotionStatus;
}

export interface AuthorityRequest {
  readonly actor: Actor;
  readonly action: AuthorityAction;
  readonly artefact: Artefact;
  /** Required for `promote`: the stage being moved into. */
  readonly targetStatus?: PromotionStatus;
}

/** Stable identifiers so a review comment can cite a rule, not a paraphrase. */
export type AuthorityRuleId =
  | 'AP-R01' // assertion is open to every actor
  | 'AP-R02' // authority requires a human
  | 'AP-R03' // no actor ratifies its own output
  | 'AP-R04' // the lifecycle sequence is not skippable
  | 'AP-R05' // each stage has a named authority
  | 'AP-R06'; // office-specific acts defer to RBAC

export interface AuthorityDecision {
  readonly permitted: boolean;
  /** One sentence, written to be pasted into a review comment verbatim. */
  readonly reason: string;
  readonly rule: AuthorityRuleId;
  /** The ADR the rule comes from. */
  readonly citation: string;
}

// ─── The guard ──────────────────────────────────────────────────────────────

/**
 * Answers "may this actor take this action on this artefact?".
 *
 * The checks are ordered so the *sharpest* refusal wins rather than the first
 * applicable one. An agent promoting its own finding is refused by both AP-R02
 * and AP-R03; AP-R03 runs first because "you cannot certify your own output" is
 * the reason a reviewer needs, and "agents are not human" is the reason they
 * already assumed.
 */
export function evaluateAuthority(request: AuthorityRequest): AuthorityDecision {
  const { actor, action, artefact, targetStatus } = request;

  // AP-R01 — Assertion is unbounded, on purpose. An agent that hesitates to
  // report a finding is worse than one that reports too many: the cost of a
  // surplus observation is a review, the cost of a missing one is a blind spot.
  if (isAssertive(action)) {
    return {
      permitted: true,
      reason: `"${action}" is an assertion, not a decision: it commits the organisation to nothing and any actor may perform it.`,
      rule: 'AP-R01',
      citation: 'ADR-0101 §3 (Core outputs are non-binding); ADR-0115 (an agent may detect, analyse and draft)',
    };
  }

  // AP-R03 — Self-authorization. The defect this whole module exists to prevent.
  if (artefact.authoredBy !== undefined && artefact.authoredBy === actor.id && !isHumanAuthority(actor)) {
    return {
      permitted: false,
      reason: `Actor "${actor.id}" may not "${action}" ${artefact.kind} "${artefact.id}", which it authored itself. An actor that certifies its own output is checked by nothing, so the certification carries no information; authority over a finding must come from outside the process that produced it.`,
      rule: 'AP-R03',
      citation: 'ADR-0115 (an agent may not turn an inference into a rule); ADR-0101 §3',
    };
  }

  // AP-R02 — Authority requires a person who can be asked why.
  if (!isHumanAuthority(actor)) {
    return {
      permitted: false,
      reason: `"${action}" is an act of authority and actor "${actor.id}" is a ${actor.kind}. Non-human actors emit non-binding output only; the binding decision is taken and recorded by a human authority.`,
      rule: 'AP-R02',
      citation: 'ADR-0101 §3 (DecisionRecommendation is non-binding; the binding GateDecision belongs to the consumer); ADR-0115 §Authority boundary',
    };
  }

  if (action === 'promote' || action === 'accept') {
    return evaluatePromotion(actor, artefact, action, targetStatus);
  }

  // AP-R06 — `ratify`, `waive` and `enforce` require a human, which is settled
  // above. *Which* human is not settled by these three ADRs: ADR-0101 places the
  // binding decision outside the Core entirely, so the office is a consumer
  // concern and is checked by domain/rbac, not here.
  return {
    permitted: true,
    reason: `"${action}" requires human authority and actor "${actor.id}" is a ${actor.kind}. Which office may perform it is not fixed by the advisory boundary — apply the gate's role requirement (domain/rbac) as a second check.`,
    rule: 'AP-R06',
    citation: 'ADR-0101 §3 (the binding decision is taken by the consumer, not the Core)',
  };
}

/**
 * Promotion is two questions that must not be collapsed: is the *move* legal,
 * and is this actor the one who may make it? Reporting them separately is what
 * lets a reviewer tell "wrong stage" from "wrong person".
 */
function evaluatePromotion(
  actor: Actor,
  artefact: Artefact,
  action: 'promote' | 'accept',
  targetStatus?: PromotionStatus,
): AuthorityDecision {
  const target: PromotionStatus | undefined = action === 'accept' ? 'accepted' : targetStatus;

  if (target === undefined) {
    return {
      permitted: false,
      reason: `A "promote" request must name the stage being moved into; ${artefact.kind} "${artefact.id}" carries no target status, so no authority can be checked.`,
      rule: 'AP-R04',
      citation: 'ADR-0097 §1 (four-stage promotion pipeline)',
    };
  }

  const current = artefact.status ?? 'candidate';

  // AP-R04 — Shape of the move.
  if (!isValidPromotion(current, target)) {
    const skipping = TERMINAL_STATUSES.includes(current)
      ? `"${current}" is a terminal state and admits no further promotion`
      : `stages are sequential and must not be skipped`;
    return {
      permitted: false,
      reason: `Promotion of ${artefact.kind} "${artefact.id}" from "${current}" to "${target}" is not a valid transition: ${skipping}. The lifecycle is candidate → evaluated → accepted → executable, with any stage able to retire.`,
      rule: 'AP-R04',
      citation: 'ADR-0097 §1 Transition Rules',
    };
  }

  // AP-R05 — Office holding the stage.
  const permittedKinds = PROMOTION_AUTHORITY[target];
  if (!permittedKinds.includes(actor.kind)) {
    return {
      permitted: false,
      reason: `Actor "${actor.id}" (${actor.kind}) may not promote ${artefact.kind} "${artefact.id}" to "${target}". That stage is reserved to: ${permittedKinds.join(', ')}.`,
      rule: 'AP-R05',
      citation: 'ADR-0097 §1 (custodian column) and §2 (the Architecture Board retains sole authority for accepted and executable)',
    };
  }

  return {
    permitted: true,
    reason: `Actor "${actor.id}" (${actor.kind}) may promote ${artefact.kind} "${artefact.id}" from "${current}" to "${target}".`,
    rule: 'AP-R05',
    citation: 'ADR-0097 §1',
  };
}

/** Convenience predicate for call sites that only need the boolean. */
export function isPermitted(request: AuthorityRequest): boolean {
  return evaluateAuthority(request).permitted;
}

// ─── Enforcement ────────────────────────────────────────────────────────────

export class AuthorityViolationError extends EvolithError {
  constructor(
    public readonly decision: AuthorityDecision,
    public readonly request: AuthorityRequest,
  ) {
    super(decision.reason, 'AUTHORITY_VIOLATION', {
      rule: decision.rule,
      citation: decision.citation,
      actorId: request.actor.id,
      actorKind: request.actor.kind,
      action: request.action,
      artefactId: request.artefact.id,
    });
    this.name = 'AuthorityViolationError';
  }
}

/** Throws `AuthorityViolationError` unless the request is permitted. */
export function requireAuthority(request: AuthorityRequest): void {
  const decision = evaluateAuthority(request);
  if (!decision.permitted) {
    throw new AuthorityViolationError(decision, request);
  }
}

/**
 * Renders a decision as a review comment. The rule id and the ADR citation are
 * both included because a refusal a reviewer cannot trace back to a decision
 * record is just another opinion.
 */
export function formatAuthorityDecision(decision: AuthorityDecision): string {
  const verdict = decision.permitted ? 'permitted' : 'refused';
  return [`[${decision.rule}] ${verdict}: ${decision.reason}`, `Source: ${decision.citation}`].join(
    '\n',
  );
}
