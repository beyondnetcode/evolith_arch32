/**
 * Builds the legacy pipeline input (SatelliteManifest) from the canonical
 * EvaluationContext, resolving the opaque workspaceRef server-side. GT-378.
 *
 * The Core never sees a raw filesystem path from the consumer: the consumer
 * sends `workspaceRef`, and the injected resolver maps it to concrete paths.
 */

import type { SatelliteManifest } from '../domain/satellite-manifest';
import type { EvaluationContext } from './contracts';
import type { IWorkspaceReferenceResolver } from './ports/workspace-reference-resolver.port';

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
  return {
    satellitePath: ws.satellitePath,
    corePath: ws.corePath,
    topology: ctx.topologyRef,
    // Canonical phaseId; the pipeline normalizes to the legacy f1..f5 keying.
    phase: ctx.phaseId,
  };
}
