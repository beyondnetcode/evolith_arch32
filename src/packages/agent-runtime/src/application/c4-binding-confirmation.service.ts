/**
 * C4BindingConfirmationService — turns proposed C4↔module bindings into a governed, versioned
 * correspondence by putting each one in front of a human (GT-590 AC2).
 *
 * The whole point of the gap is that a confirmed mapping is an asset a detector cannot produce,
 * because producing it needs approval authority and somewhere to keep the decision. This service is
 * the seam where both arrive:
 *
 *  - AUTHORITY comes from {@link IApprovalPort}, the same HITL gate GT-608 proved end to end over
 *    real HTTP (Runtime → Tracker → human → audit). One approval per binding, carrying an
 *    {@link ApprovalSubject} so the human is deciding about a specific correspondence rather than
 *    about "some capability" — and so the Tracker row records WHICH binding was approved.
 *  - MEMORY comes from {@link IC4BindingMapStore}, append-only: every confirmation mints the next
 *    version of the map and the prior version stays readable.
 *
 * Two refusals are load-bearing rather than defensive:
 *
 *  1. A grant with no named approver is treated as NOT confirmed. `TrackerApprovalAdapter` returns
 *     the approver the Tracker named and never invents one; if none came back, the Core has a
 *     `granted: true` it cannot attribute, and an unattributable confirmation is worth no more than
 *     the guess it replaced.
 *  2. A proposal scored against a different tree than the map was built on is refused by
 *     `confirmC4Binding` — the prefix the human saw may no longer exist.
 *
 * Nothing here scores, and nothing here enforces. Scoring is the provider's job; enforcement reads
 * the returned map through `applyC4BindingMap` + `compileC4ToBoundaryRules`.
 */

import {
  confirmC4Binding,
  emptyC4BindingMap,
  type C4BindingMap,
  type C4BindingProposalSet,
} from '@beyondnet/evolith-core-domain/application/validators/enforcement/c4-binding';
import type { AgentRuntimeRequest } from '../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../domain/contracts/capability';
import type { ApprovalDecision, IApprovalPort } from '../domain/ports/approval.port';
import type { IC4BindingMapStore } from '../domain/ports/c4-binding-map.port';

/** Capability id the confirmation gate runs under. Governed: it always requires approval. */
export const C4_BINDING_APPROVAL_SKILL_ID = 'confirm-c4-binding';

/** Subject family the approval carries (see {@link ApprovalSubject}). */
export const C4_BINDING_SUBJECT_KIND = 'c4-binding';

/** One element's binding put to a human. Which candidate, chosen by the caller from the proposals. */
export interface C4BindingConfirmationRequest {
  readonly elementId: string;
  /**
   * The prefix to confirm. Defaults to the top candidate for the element; supplying it explicitly
   * is how a reviewer OVERRIDES the scorer, which is the whole reason a human is in the loop.
   */
  readonly modulePrefix?: string;
  readonly importPrefix?: string;
}

export interface C4BindingConfirmationOutcome {
  readonly elementId: string;
  readonly modulePrefix: string;
  readonly confirmed: boolean;
  readonly approvalId?: string;
  readonly approver?: string;
  /** Why it was not confirmed, when it was not. Never blank on a refusal. */
  readonly reason?: string;
}

export interface C4BindingConfirmationResult {
  /** The map after every granted confirmation. Equal to the prior head when none were granted. */
  readonly map: C4BindingMap;
  /** One outcome per requested element, in the order requested. */
  readonly outcomes: readonly C4BindingConfirmationOutcome[];
}

export interface C4BindingConfirmationOptions {
  readonly approval: IApprovalPort;
  readonly store: IC4BindingMapStore;
  /** Injected clock for `confirmedAt`, so a confirmation is reproducible under test. */
  readonly now?: () => string;
}

export class C4BindingConfirmationService {
  private readonly approval: IApprovalPort;
  private readonly store: IC4BindingMapStore;
  private readonly now: () => string;

  constructor(options: C4BindingConfirmationOptions) {
    this.approval = options.approval;
    this.store = options.store;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  /**
   * Put each requested binding to the HITL gate and persist the resulting versions.
   *
   * Granted confirmations are applied one at a time, each producing (and storing) its own version:
   * a run that is interrupted halfway leaves a coherent map at a real version, not a partial write.
   * Anything not granted leaves the map untouched and is reported.
   */
  async confirm(
    scopeId: string,
    proposals: C4BindingProposalSet,
    requests: readonly C4BindingConfirmationRequest[],
    request: AgentRuntimeRequest,
  ): Promise<C4BindingConfirmationResult> {
    let map = (await this.store.head(scopeId)) ?? emptyC4BindingMap(proposals.factsContentHash);
    if (map.version === 0 && (await this.store.head(scopeId)) === undefined) {
      await this.store.append(scopeId, map);
    }

    const outcomes: C4BindingConfirmationOutcome[] = [];

    for (const wanted of requests) {
      const proposal = proposals.proposals.find((p) => p.elementId === wanted.elementId);
      const candidate = wanted.modulePrefix
        ? proposal?.candidates.find((c) => c.modulePrefix === wanted.modulePrefix)
        : proposal?.candidates[0];
      const modulePrefix = wanted.modulePrefix ?? candidate?.modulePrefix;

      if (!proposal || !modulePrefix) {
        outcomes.push({
          elementId: wanted.elementId,
          modulePrefix: modulePrefix ?? '',
          confirmed: false,
          reason: !proposal
            ? `No proposal for element '${wanted.elementId}'.`
            : `Element '${wanted.elementId}' has no candidate prefix to confirm.`,
        });
        continue;
      }

      // The confidence the human is shown. Absent when they typed a prefix the scorer never
      // proposed — an override is worth recording as exactly that, a 0-confidence proposal.
      const proposedConfidence = candidate?.confidence ?? 0;

      const decision: ApprovalDecision = await this.approval.requireApproval({
        skill: bindingApprovalSkill(),
        request,
        subject: {
          kind: C4_BINDING_SUBJECT_KIND,
          ref: `${scopeId}:${proposal.elementId}`,
          summary:
            `Bind C4 element '${proposal.elementName}' (${proposal.elementId}) to code under ` +
            `'${modulePrefix}'. Proposed by ${proposals.determinism} scoring at confidence ` +
            `${proposedConfidence}; confirming makes it enforceable.`,
          confidence: proposedConfidence,
          payload: {
            scopeId,
            elementId: proposal.elementId,
            elementName: proposal.elementName,
            modulePrefix,
            factsContentHash: proposals.factsContentHash,
            currentMapVersion: map.version,
          },
        },
      });

      if (!decision.granted) {
        outcomes.push({
          elementId: proposal.elementId,
          modulePrefix,
          confirmed: false,
          ...(decision.approvalId ? { approvalId: decision.approvalId } : {}),
          reason: decision.reason ?? `Approval not granted (status '${decision.status ?? 'unknown'}').`,
        });
        continue;
      }

      const approver = decision.approver?.trim();
      if (!approver) {
        // Fail-closed: a grant the Core cannot attribute to a person is not a confirmation.
        outcomes.push({
          elementId: proposal.elementId,
          modulePrefix,
          confirmed: false,
          ...(decision.approvalId ? { approvalId: decision.approvalId } : {}),
          reason:
            'Approval was granted but named no approver. A confirmed correspondence must be ' +
            'attributable to a human; the Core does not supply one.',
        });
        continue;
      }

      const next = confirmC4Binding(
        map,
        {
          elementId: proposal.elementId,
          modulePrefix,
          ...(wanted.importPrefix ? { importPrefix: wanted.importPrefix } : {}),
          confirmedBy: approver,
          confirmedAt: this.now(),
          ...(decision.approvalId ? { approvalId: decision.approvalId } : {}),
          proposedConfidence,
        },
        proposals.factsContentHash,
      );
      await this.store.append(scopeId, next);
      map = next;

      outcomes.push({
        elementId: proposal.elementId,
        modulePrefix,
        confirmed: true,
        ...(decision.approvalId ? { approvalId: decision.approvalId } : {}),
        approver,
      });
    }

    return { map, outcomes };
  }
}

/**
 * The capability the gate runs under. `requiresApproval` is `true` and is not a caller's choice:
 * a "confirm this binding" that could run unapproved would be a self-granted governance decision.
 */
function bindingApprovalSkill(): SkillDescriptor {
  return {
    id: C4_BINDING_APPROVAL_SKILL_ID,
    description:
      'Ratify a proposed correspondence between an element of the intended C4 model and a ' +
      'directory of real code, making it enforceable.',
    intents: ['confirm_c4_binding'],
    kind: 'evaluation',
    permissions: ['read:repo', 'write:governance'],
    requiresApproval: true,
    emitsTrace: true,
    requiresPolicy: false,
  };
}
