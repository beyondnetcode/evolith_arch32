import { z } from 'zod';

/**
 * Canonical SDLC phase identifiers accepted by the evaluation pipeline.
 * Canonical values are the phase names; f1-f5 are legacy aliases still
 * supported for backwards compatibility.
 */
export const SATELLITE_PHASE_VALUES = [
  'discovery',
  'design',
  'construction',
  'qa',
  'release',
  'f1',
  'f2',
  'f3',
  'f4',
  'f5',
] as const;

export type SatellitePhase = (typeof SATELLITE_PHASE_VALUES)[number];

/**
 * Canonical topology identifiers accepted by the evaluation pipeline.
 * Progressive-axis topologies support the F1/F2/F3 canonical IDs.
 */
export const SATELLITE_TOPOLOGY_VALUES = [
  'modular-monolith',
  'distributed-modules',
  'microservices',
  'serverless',
  'edge-computing',
  'event-driven',
  'data-mesh',
  'agentic-ai',
] as const;

export type SatelliteTopologyId = (typeof SATELLITE_TOPOLOGY_VALUES)[number];

/**
 * Zod sub-schemas for the EvaluationFacts nested objects (GT-380 L1c).
 */
const EvaluationFactsGateSchema = z.object({
  phase: z.number(),
  mandatoryEvidence: z.array(z.object({
    artifact: z.string(),
    validation: z.string().optional(),
    rules: z.array(z.string()).optional(),
  })).optional(),
  blockingCriteria: z.array(z.object({
    criterion: z.string(),
    action: z.string().optional(),
  })).optional(),
});

const EvaluationFactsEvidenceSchema = z.object({
  artifact: z.string(),
  status: z.string().optional(),
});

const EvaluationFactsWaiverSchema = z.object({
  criterion: z.string(),
  status: z.string(),
  expirationDate: z.string().optional(),
});

const EvaluationFactsSchema = z.object({
  context: z.record(z.string(), z.unknown()).optional(),
  gate: EvaluationFactsGateSchema.optional(),
  evidence: z.array(EvaluationFactsEvidenceSchema).optional(),
  waiver: z.array(EvaluationFactsWaiverSchema).optional(),
  tenantId: z.string().optional(),
  evaluationDate: z.string().optional(),
}).optional();

/**
 * Formal Zod schema for the SatelliteManifest ingestion contract (GT-359, GT-396).
 *
 * Validates the payload that any client surface (CLI, MCP, REST) must provide
 * to trigger an SDLC evaluation pipeline run. Unknown keys are stripped
 * (`.strip()` is Zod's default for objects).
 *
 * GT-396: Added `facts` sub-schema so it is no longer silently stripped by
 * the validator. Aligned `phase` to accept both canonical and legacy values.
 */
export const SatelliteManifestSchema = z.object({
  /** Filesystem path to the satellite repository — the only required field. */
  satellitePath: z.string().min(1, 'satellitePath is required'),

  /** Optional explicit path to the Evolith Core repository. Auto-detected when omitted. */
  corePath: z.string().optional(),

  /**
   * Optional topology override.
   * Accepts any string so consumers can pass custom topology IDs; the pipeline
   * validates the resolved topology against the catalog.
   */
  topology: z.string().optional(),

  /**
   * Optional SDLC phase to evaluate.
   * Accepts canonical names (discovery..release) and legacy aliases (f1..f5).
   */
  phase: z.enum(SATELLITE_PHASE_VALUES).optional(),

  /**
   * GT-380 L1c / GT-396: Declared facts projected from the canonical
   * EvaluationContext, threaded down to the OPA input builder.
   * Previously missing from the Zod schema — was silently stripped.
   */
  facts: EvaluationFactsSchema,
});

/** TypeScript type inferred from the schema — the canonical ingestion contract. */
export type SatelliteManifestDto = z.infer<typeof SatelliteManifestSchema>;

/**
 * Parse and validate a raw object as a SatelliteManifest.
 * Throws a ZodError with structured messages on validation failure.
 */
export function parseSatelliteManifest(raw: unknown): SatelliteManifestDto {
  return SatelliteManifestSchema.parse(raw);
}

/**
 * Safe (non-throwing) variant. Returns `{ success, data?, error? }`.
 */
export function safeParseSatelliteManifest(raw: unknown) {
  return SatelliteManifestSchema.safeParse(raw);
}
