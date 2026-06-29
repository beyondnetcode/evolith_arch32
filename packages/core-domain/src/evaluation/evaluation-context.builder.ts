/**
 * Builds the legacy pipeline input (SatelliteManifest) from the canonical
 * EvaluationContext. GT-378.
 *
 * The Core never sees a raw filesystem path from the consumer: the consumer
 * sends `workspaceRef`, the orchestrator resolves it via an injected resolver,
 * and this pure function maps the resolved workspace + context to a manifest.
 */

import type { SatelliteManifest } from '../domain/satellite-manifest';
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
  };
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
