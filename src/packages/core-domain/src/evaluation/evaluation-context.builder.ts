/**
 * Builds the legacy pipeline input (SatelliteManifest) from the canonical
 * EvaluationContext. GT-378.
 *
 * The Core never sees a raw filesystem path from the consumer: the consumer
 * sends `workspaceRef`, the orchestrator resolves it via an injected resolver,
 * and this pure function maps the resolved workspace + context to a manifest.
 */

import type { EvaluationFacts, SatelliteManifest } from '../domain/satellite-manifest';
import { toLegacyPhaseId } from '../domain/sdlc/phase-id';
import type { EvaluationContext } from './contracts';
import type {
  IWorkspaceReferenceResolver,
  ResolvedWorkspace,
} from './ports/workspace-reference-resolver.port';

/** Pure: build the pipeline manifest from a context + an already-resolved workspace. */
export function manifestFromWorkspace(
  ctx: EvaluationContext,
  workspace: ResolvedWorkspace,
): SatelliteManifest {
  return {
    satellitePath: workspace.satellitePath,
    corePath: workspace.corePath,
    topology: ctx.topologyRef,
    // Canonical phaseId; the pipeline normalizes to the legacy f1..f5 keying.
    phase: ctx.phaseId,
    // GT-380 L1c: project the declared facts so they reach the OPA input.
    facts: evaluationFactsFromContext(ctx),
  };
}

// ---------------------------------------------------------------------------
// GT-380 L1c — project the canonical EvaluationContext into OPA-input facts.
// Returns `undefined` when the context declares no facts, so legacy / minimal
// callers thread nothing and the OPA input stays byte-for-byte identical.
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function hasKeys(value: unknown): boolean {
  const r = asRecord(value);
  return !!r && Object.keys(r).length > 0;
}

/** f1..f5 / canonical phase id → its integer 1..5 (or undefined). */
function phaseToNumber(phaseId?: string): number | undefined {
  if (!phaseId) return undefined;
  const legacy = toLegacyPhaseId(phaseId); // 'f3' | undefined
  const n = legacy ? Number.parseInt(legacy.slice(1), 10) : NaN;
  return Number.isInteger(n) ? n : undefined;
}

/** Coerce string[] | {criterion}[] → {criterion}[]. */
function asCriteriaArray(value: unknown): readonly { criterion: string }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((e) =>
      typeof e === 'string'
        ? { criterion: e }
        : asRecord(e) && typeof (e as Record<string, unknown>).criterion === 'string'
          ? { criterion: (e as Record<string, unknown>).criterion as string }
          : undefined,
    )
    .filter((e): e is { criterion: string } => !!e);
  return out.length ? out : undefined;
}

function asWaiverArray(
  value: unknown,
): readonly { criterion: string; status: string; expirationDate?: string }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((e) => {
      const r = asRecord(e);
      if (!r || typeof r.criterion !== 'string' || typeof r.status !== 'string') return undefined;
      return {
        criterion: r.criterion,
        status: r.status,
        ...(typeof r.expirationDate === 'string' ? { expirationDate: r.expirationDate } : {}),
      };
    })
    .filter((e): e is { criterion: string; status: string; expirationDate?: string } => !!e);
  return out.length ? out : undefined;
}

/**
 * Pure projection: canonical EvaluationContext → OPA-input-shaped facts.
 * Triggered only when the consumer DECLARED facts (artifacts / evidence / gateId
 * / tenant|product|initiative / checkpoint / sdlcConfig / customConstraints);
 * otherwise returns undefined.
 */
export function evaluationFactsFromContext(ctx: EvaluationContext): EvaluationFacts | undefined {
  const declared =
    !!ctx.artifacts?.required?.length ||
    !!ctx.artifacts?.presented?.length ||
    !!ctx.evidence?.length ||
    !!ctx.gateId ||
    !!ctx.tenant ||
    !!ctx.product ||
    !!ctx.initiative ||
    !!ctx.checkpoint ||
    hasKeys(ctx.sdlcConfig) ||
    hasKeys(ctx.customConstraints);
  if (!declared) return undefined;

  const facts: {
    context?: Record<string, unknown>;
    gate?: EvaluationFacts['gate'];
    evidence?: EvaluationFacts['evidence'];
    waiver?: EvaluationFacts['waiver'];
    tenantId?: string;
    evaluationDate?: string;
  } = {};

  // --- input.context: opaque echoes + declared dod/spec sub-configs ---
  const context: Record<string, unknown> = {};
  if (ctx.tenant) context.tenant = ctx.tenant;
  if (ctx.product) context.product = ctx.product;
  if (ctx.initiative) context.initiative = ctx.initiative;
  if (ctx.phaseId) context.phaseId = ctx.phaseId;
  if (ctx.gateId) context.gateId = ctx.gateId;
  if (ctx.topologyRef) context.topologyRef = ctx.topologyRef;
  if (ctx.executionMode) context.executionMode = ctx.executionMode;
  // GT-586: attribution reaches the policy input so a rule can discriminate on WHO
  // asked (human vs agent) and on WHICH revision. Deliberately NOT part of the
  // `declared` trigger above: a context carrying only a requester still projects no
  // facts, so the OPA input of every pre-GT-586 caller stays byte-for-byte identical.
  if (ctx.requester) context.requester = ctx.requester;
  if (ctx.repositoryRevision) context.repositoryRevision = ctx.repositoryRevision;
  if (ctx.correlationId) context.correlationId = ctx.correlationId;
  if (ctx.schemaVersion) context.schemaVersion = ctx.schemaVersion;
  if (ctx.evidence?.length) context.evidence = ctx.evidence;
  // DoD metrics + compliance pillars from the loosely-typed escape hatches
  // (no typed home on EvaluationContext — GAP flagged in GT-380 design).
  const dod =
    asRecord(ctx.sdlcConfig?.['dod']) ??
    asRecord(ctx.customConstraints?.['dod']) ??
    asRecord(ctx.checkpoint?.metrics);
  if (dod) context.dod = dod;
  const compliance =
    asRecord(ctx.sdlcConfig?.['compliance']) ?? asRecord(ctx.customConstraints?.['compliance']);
  if (compliance) context.spec = { compliance };
  if (Object.keys(context).length) facts.context = context;

  // --- input.gate (phase-gates.rego) ---
  const gate: { phase?: number; mandatoryEvidence?: { artifact: string }[]; blockingCriteria?: { criterion: string }[] } = {};
  const phase = phaseToNumber(ctx.phaseId);
  if (phase !== undefined) gate.phase = phase;
  if (ctx.artifacts?.required?.length) {
    gate.mandatoryEvidence = ctx.artifacts.required.map((artifact) => ({ artifact }));
  }
  const blocking = asCriteriaArray(ctx.customConstraints?.['blockingCriteria']);
  if (blocking) gate.blockingCriteria = [...blocking];
  if (Object.keys(gate).length) facts.gate = gate;

  // --- input.evidence: presented-artifact presence ---
  if (ctx.artifacts?.presented?.length) {
    facts.evidence = ctx.artifacts.presented.map((p) => ({ artifact: p.artifactId, status: 'present' }));
  }

  // --- input.waiver ---
  const waivers = asWaiverArray(ctx.customConstraints?.['waivers']);
  if (waivers) facts.waiver = [...waivers];

  // --- root tenantId + evaluationDate ---
  if (ctx.tenant?.tenantId) facts.tenantId = ctx.tenant.tenantId;
  const evalDate = ctx.passthrough?.['evaluationDate'];
  if (typeof evalDate === 'string') facts.evaluationDate = evalDate;

  return Object.keys(facts).length ? facts : undefined;
}

/** Convenience: resolve the workspaceRef then build the manifest. */
export async function buildSatelliteManifest(
  ctx: EvaluationContext,
  resolver: IWorkspaceReferenceResolver,
): Promise<SatelliteManifest> {
  if (!ctx.workspaceRef) {
    throw new Error(
      'EvaluationContext.workspaceRef is required to resolve a workspace for evaluation',
    );
  }
  const ws = await resolver.resolve(ctx.workspaceRef);
  return manifestFromWorkspace(ctx, ws);
}
