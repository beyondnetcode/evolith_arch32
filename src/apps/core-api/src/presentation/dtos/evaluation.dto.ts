import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { EvaluationKind } from '@beyondnet/evolith-core-domain/evaluation/contracts';

/**
 * Inline satellite content sent in the request (additive; stateless Core).
 *
 * `files` is a map of RELATIVE path -> file content. It MUST include
 * `evolith.yaml` at the satellite root, plus any sources/docs the caller chose
 * to send. The Core evaluates exactly this content in memory: it never writes it
 * to disk and never reaches the network for it (ADR-0074 workspaceRef semantics
 * are unchanged — this is a third, additive input).
 */
export class EvaluationInputDto {
  @ApiProperty({
    description:
      'Map of RELATIVE path -> file content. Must include evolith.yaml at the satellite root.',
    example: {
      'evolith.yaml': '{ "coreRef": { "version": "1.0.0" } }',
      'docs/prd.md': '# PRD',
    },
    additionalProperties: { type: 'string' },
  })
  @IsObject()
  files!: Record<string, string>;
}

/**
 * Legacy satellite-path evaluation request (pre-ADR-0101). Retained for
 * backward compatibility; new consumers should send the canonical
 * EvaluationContext (workspaceRef + kinds) instead.
 */
export class EvaluateSatelliteDto {
  @ApiProperty({
    description: 'Filesystem path to the satellite repository',
    example: '/path/to/satellite',
  })
  @IsString()
  @MinLength(1)
  satellitePath!: string;

  @ApiPropertyOptional({
    description: 'Optional explicit path to the Evolith Core repository',
    example: '/path/to/core',
  })
  @IsOptional()
  @IsString()
  corePath?: string;

  @ApiPropertyOptional({
    description: 'Optional topology override',
    example: 'modular-monolith',
  })
  @IsOptional()
  @IsString()
  topology?: string;

  @ApiPropertyOptional({
    description: 'Optional SDLC phase to evaluate',
    example: 'f1',
  })
  @IsOptional()
  @IsString()
  phase?: string;
}

/**
 * Canonical EvaluationContext request (GT-378 / ADR-0101).
 *
 * A consumer (Tracker/CLI/MCP/CI) sends this to POST /api/v1/evaluate and the
 * Core returns an EvaluationResult. The Core never receives raw paths: the
 * consumer sends an opaque `workspaceRef`. `tenant/product/initiative` are
 * opaque context identifiers, never Core entities.
 *
 * Legacy `satellitePath`/`topology`/`phase` fields are accepted for backward
 * compatibility; when `workspaceRef` is absent the controller falls back to the
 * legacy evaluation path.
 */
export class EvaluationContextDto {
  @ApiPropertyOptional({
    description: 'Evaluation kinds requested',
    example: ['gate', 'compliance'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  kinds?: EvaluationKind[];

  @ApiPropertyOptional({
    description:
      'Opaque workspace reference (ADR-0074). Resolved server-side; never a raw path.',
    example: 'ws-3f9a',
  })
  @IsOptional()
  @IsString()
  workspaceRef?: string;

  @ApiPropertyOptional({
    description: 'Opaque tenant context',
    example: { tenantId: 't-acme' },
  })
  @IsOptional()
  @IsObject()
  tenant?: { tenantId: string };

  @ApiPropertyOptional({
    description: 'Opaque product context',
    example: { productId: 'p-checkout' },
  })
  @IsOptional()
  @IsObject()
  product?: { productId: string; tenantId?: string };

  @ApiPropertyOptional({
    description: 'Opaque initiative context',
    example: { initiativeId: 'i-3ds' },
  })
  @IsOptional()
  @IsObject()
  initiative?: { initiativeId: string; productId?: string };

  @ApiPropertyOptional({
    description: 'Canonical SDLC phase id',
    example: 'construction',
  })
  @IsOptional()
  @IsString()
  phaseId?: string;

  @ApiPropertyOptional({
    description: 'Gate id to evaluate',
    example: 'gate-f2',
  })
  @IsOptional()
  @IsString()
  gateId?: string;

  @ApiPropertyOptional({ description: 'Versioned ruleset reference' })
  @IsOptional()
  @IsString()
  rulesetRef?: string;

  @ApiPropertyOptional({
    description: 'Topology reference/override',
    example: 'modular-monolith',
  })
  @IsOptional()
  @IsString()
  topologyRef?: string;

  @ApiPropertyOptional({ description: 'Execution mode', example: 'hybrid' })
  @IsOptional()
  @IsString()
  executionMode?: string;

  @ApiPropertyOptional({
    description: 'Consumer correlation id (echoed, never interpreted)',
  })
  @IsOptional()
  @IsString()
  correlationId?: string;

  // --- Remaining canonical EvaluationContext fields (mirror of the domain
  //     contract so the full context — as sent by the Tracker/CLI/agent-runtime —
  //     passes whitelist validation and reaches the orchestrator). ---

  @ApiPropertyOptional({ description: 'Opaque initiative-group context' })
  @IsOptional()
  @IsObject()
  initiativeGroup?: Readonly<Record<string, unknown>>;

  @ApiPropertyOptional({
    description: 'Declared artifact facts (not scanned from disk)',
  })
  @IsOptional()
  @IsObject()
  artifacts?: Readonly<Record<string, unknown>>;

  @ApiPropertyOptional({ description: 'Declared evidence facts' })
  @IsOptional()
  @IsArray()
  evidence?: readonly unknown[];

  // GT-652 — the five fields the engine READS and the wire could not carry.
  //
  // `EvaluationContextDto` is the whitelist: `main.ts` runs the global ValidationPipe with
  // `forbidNonWhitelisted: true`, so a field absent here does not arrive stripped — it 400s the
  // whole evaluation. The controller then does `body as unknown as EvaluationContext`, a straight
  // cast, which means this class IS the reachable surface of the canonical context. Each of the
  // five below is consumed by the domain today; until now none of them could be sent.
  //
  // They are typed loosely (`IsObject`/`IsArray`) for the same reason every neighbour above is:
  // the shapes live in `@beyondnet/evolith-contracts` and re-declaring them here would create a
  // second definition to keep in step, which is the drift this repository keeps paying for.

  @ApiPropertyOptional({
    description: 'WHO asked for the evaluation (actor type/id, model, session). Attribution of the REQUEST, never of a finding.',
  })
  @IsOptional()
  @IsObject()
  requester?: Readonly<Record<string, unknown>>;

  @ApiPropertyOptional({
    description: 'WHICH revision was judged (revision, repositoryRef, branch, committedAt, dirty). Absent means the producer did not know it.',
  })
  @IsOptional()
  @IsObject()
  repositoryRevision?: Readonly<Record<string, unknown>>;

  @ApiPropertyOptional({
    description: 'Canonical quality-signal evidence (ADR-0111). Evaluated inline; the Core never executes a provider.',
  })
  @IsOptional()
  @IsArray()
  qualitySignals?: readonly unknown[];

  @ApiPropertyOptional({
    description: 'Canonical structural fact base (GT-589), produced OUTSIDE the Core and passed inline. Absent yields no structural findings, never a failure.',
  })
  @IsOptional()
  @IsObject()
  repoFacts?: Readonly<Record<string, unknown>>;

  @ApiPropertyOptional({
    description: 'The SAME repository at an earlier revision (GT-594), for the signals that only exist between two points in time.',
  })
  @IsOptional()
  @IsObject()
  baselineRepoFacts?: Readonly<Record<string, unknown>>;

  @ApiPropertyOptional({ description: 'Declared checkpoint context' })
  @IsOptional()
  @IsObject()
  checkpoint?: Readonly<Record<string, unknown>>;

  @ApiPropertyOptional({ description: 'Declared deployment context' })
  @IsOptional()
  @IsObject()
  deployment?: Readonly<Record<string, unknown>>;

  @ApiPropertyOptional({ description: 'Declared architecture context' })
  @IsOptional()
  @IsObject()
  architecture?: Readonly<Record<string, unknown>>;

  @ApiPropertyOptional({
    description:
      'Declared design context (ADR-0104). design.topologyConfirmedRefs: string[] is the confirmed topology composition (GT-688).',
    example: { topologyConfirmedRefs: ['modular-monolith', 'agentic-ai'] },
  })
  @IsOptional()
  @IsObject()
  design?: Readonly<Record<string, unknown>>;

  @ApiPropertyOptional({ description: 'External reference facts' })
  @IsOptional()
  @IsArray()
  externalReferences?: readonly unknown[];

  @ApiPropertyOptional({
    description: 'Tenant SDLC configuration (Core resolves nothing)',
  })
  @IsOptional()
  @IsObject()
  sdlcConfig?: Readonly<Record<string, unknown>>;

  @ApiPropertyOptional({ description: 'Tenant custom constraints' })
  @IsOptional()
  @IsObject()
  customConstraints?: Readonly<Record<string, unknown>>;

  @ApiPropertyOptional({ description: 'Versioned ruleset pointer' })
  @IsOptional()
  @IsString()
  rulesetVersion?: string;

  @ApiPropertyOptional({ description: 'Versioned policy references' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  policyRefs?: readonly string[];

  @ApiPropertyOptional({ description: 'Blueprint reference' })
  @IsOptional()
  @IsString()
  blueprintRef?: string;

  @ApiPropertyOptional({ description: 'Schema reference' })
  @IsOptional()
  @IsString()
  schemaRef?: string;

  @ApiPropertyOptional({ description: 'Decision history references' })
  @IsOptional()
  @IsArray()
  decisionHistory?: readonly unknown[];

  @ApiPropertyOptional({
    description: 'Expected verdict (advisory self-check)',
  })
  @IsOptional()
  @IsString()
  expectedResult?: string;

  @ApiPropertyOptional({
    description:
      'Opaque passthrough facts (echoed; the Core evaluates declared facts, never disk)',
  })
  @IsOptional()
  @IsObject()
  passthrough?: Readonly<Record<string, unknown>>;

  @ApiPropertyOptional({
    description: 'Contract schema version the consumer is sending',
  })
  @IsOptional()
  @IsString()
  schemaVersion?: string;

  // --- Inline content (additive, stateless). Highest priority when present. ---
  @ApiPropertyOptional({
    description:
      'Inline satellite content evaluated in memory. When present, the Core evaluates these files (no disk read/write, no network for the content) instead of resolving a workspaceRef/satellitePath.',
    type: EvaluationInputDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EvaluationInputDto)
  evaluationInput?: EvaluationInputDto;

  // --- Legacy backward-compatibility fields (used only when workspaceRef is absent) ---
  @ApiPropertyOptional({
    description: 'LEGACY (deprecated): filesystem path to the satellite repository. Use workspaceRef instead. Path traversal validation required before use.',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  satellitePath?: string;

  @ApiPropertyOptional({
    description: 'LEGACY: explicit path to the Evolith Core repository',
  })
  @IsOptional()
  @IsString()
  corePath?: string;

  @ApiPropertyOptional({ description: 'LEGACY: topology override' })
  @IsOptional()
  @IsString()
  topology?: string;

  @ApiPropertyOptional({ description: 'LEGACY: SDLC phase (f1..f5)' })
  @IsOptional()
  @IsString()
  phase?: string;
}
