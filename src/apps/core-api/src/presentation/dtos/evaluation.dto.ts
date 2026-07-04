import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsObject, MinLength } from 'class-validator';
import type { EvaluationKind } from '@evolith/core-domain/evaluation/contracts';

/**
 * Legacy satellite-path evaluation request (pre-ADR-0101). Retained for
 * backward compatibility; new consumers should send the canonical
 * EvaluationContext (workspaceRef + kinds) instead.
 */
export class EvaluateSatelliteDto {
  @ApiProperty({ description: 'Filesystem path to the satellite repository', example: '/path/to/satellite' })
  @IsString()
  @MinLength(1)
  satellitePath!: string;

  @ApiPropertyOptional({ description: 'Optional explicit path to the Evolith Core repository', example: '/path/to/core' })
  @IsOptional()
  @IsString()
  corePath?: string;

  @ApiPropertyOptional({ description: 'Optional topology override', example: 'modular-monolith' })
  @IsOptional()
  @IsString()
  topology?: string;

  @ApiPropertyOptional({ description: 'Optional SDLC phase to evaluate', example: 'f1' })
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
  @ApiPropertyOptional({ description: 'Evaluation kinds requested', example: ['gate', 'compliance'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  kinds?: EvaluationKind[];

  @ApiPropertyOptional({ description: 'Opaque workspace reference (ADR-0074). Resolved server-side; never a raw path.', example: 'ws-3f9a' })
  @IsOptional()
  @IsString()
  workspaceRef?: string;

  @ApiPropertyOptional({ description: 'Opaque tenant context', example: { tenantId: 't-acme' } })
  @IsOptional()
  @IsObject()
  tenant?: { tenantId: string };

  @ApiPropertyOptional({ description: 'Opaque product context', example: { productId: 'p-checkout' } })
  @IsOptional()
  @IsObject()
  product?: { productId: string; tenantId?: string };

  @ApiPropertyOptional({ description: 'Opaque initiative context', example: { initiativeId: 'i-3ds' } })
  @IsOptional()
  @IsObject()
  initiative?: { initiativeId: string; productId?: string };

  @ApiPropertyOptional({ description: 'Canonical SDLC phase id', example: 'construction' })
  @IsOptional()
  @IsString()
  phaseId?: string;

  @ApiPropertyOptional({ description: 'Gate id to evaluate', example: 'gate-f2' })
  @IsOptional()
  @IsString()
  gateId?: string;

  @ApiPropertyOptional({ description: 'Versioned ruleset reference' })
  @IsOptional()
  @IsString()
  rulesetRef?: string;

  @ApiPropertyOptional({ description: 'Topology reference/override', example: 'modular-monolith' })
  @IsOptional()
  @IsString()
  topologyRef?: string;

  @ApiPropertyOptional({ description: 'Execution mode', example: 'hybrid' })
  @IsOptional()
  @IsString()
  executionMode?: string;

  @ApiPropertyOptional({ description: 'Consumer correlation id (echoed, never interpreted)' })
  @IsOptional()
  @IsString()
  correlationId?: string;

  // --- Legacy backward-compatibility fields (used only when workspaceRef is absent) ---
  @ApiPropertyOptional({ description: 'LEGACY: filesystem path to the satellite repository' })
  @IsOptional()
  @IsString()
  satellitePath?: string;

  @ApiPropertyOptional({ description: 'LEGACY: explicit path to the Evolith Core repository' })
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
