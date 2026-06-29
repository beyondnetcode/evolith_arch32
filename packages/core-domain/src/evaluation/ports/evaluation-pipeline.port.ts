/**
 * Port over the existing end-to-end evaluation pipeline (GT-378 / ADR-0101).
 *
 * The EvaluationOrchestrator depends on this narrow interface rather than the
 * concrete SatelliteEvaluationPipeline, so the canonical contract layer composes
 * the existing engine without rewriting it (and stays unit-testable).
 */

import type { SatelliteManifest, EvaluationVerdict } from '../../domain/satellite-manifest';

export interface IEvaluationPipeline {
  evaluate(manifest: SatelliteManifest): Promise<EvaluationVerdict>;
}
