import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsIn,
  IsArray,
  IsDefined,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ArchitecturePlanStatus } from '@beyondnet/evolith-core-domain';

/** Functional/technical scope of the change under evaluation. */
export class ArchitecturePlanScopeDto {
  @ApiProperty({ description: 'Functional scope of the change', example: 'Add multi-tenant billing' })
  @IsString()
  functional!: string;

  @ApiProperty({ description: 'Technical scope of the change', example: 'New billing bounded context + async events' })
  @IsString()
  technical!: string;
}

/** Components and interfaces impacted by the change. */
export class ArchitecturePlanImpactDto {
  @ApiProperty({ description: 'Impacted components', type: [String], example: ['billing-service', 'gateway'] })
  @IsArray()
  @IsString({ each: true })
  components!: string[];

  @ApiProperty({ description: 'Impacted interfaces', type: [String], example: ['POST /invoices', 'BillingEvents'] })
  @IsArray()
  @IsString({ each: true })
  interfaces!: string[];
}

/** Risk profile driving the recommended SDLC rigor. */
export class ArchitecturePlanRiskAssessmentDto {
  @ApiProperty({ description: 'Business criticality', enum: ['low', 'medium', 'high'], example: 'high' })
  @IsIn(['low', 'medium', 'high'])
  criticality!: 'low' | 'medium' | 'high';

  @ApiProperty({ description: 'Technical complexity', enum: ['low', 'medium', 'high'], example: 'medium' })
  @IsIn(['low', 'medium', 'high'])
  complexity!: 'low' | 'medium' | 'high';

  @ApiProperty({ description: 'Identified security risks', type: [String], example: ['PII exposure'] })
  @IsArray()
  @IsString({ each: true })
  security_risks!: string[];

  @ApiProperty({ description: 'Identified architectural risks', type: [String], example: ['tight coupling'] })
  @IsArray()
  @IsString({ each: true })
  architectural_risks!: string[];
}

/** Governance outcome (advisory; the engine only suggests). */
export class ArchitecturePlanGovernanceDto {
  @ApiPropertyOptional({ description: 'Suggested SDLC mode', enum: ['full', 'tailored', 'minimal', 'rejected'], example: 'tailored' })
  @IsOptional()
  @IsIn(['full', 'tailored', 'minimal', 'rejected'])
  sdlc_mode_suggested?: 'full' | 'tailored' | 'minimal' | 'rejected';

  @ApiPropertyOptional({ description: 'Justification for the suggested mode' })
  @IsOptional()
  @IsString()
  justification?: string;

  @ApiPropertyOptional({ description: 'Approvals required before execution', type: [String], example: ['principal-architect'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  required_approvals?: string[];
}

/** Suggested downstream execution shape (phases, gates, ADRs, policies). */
export class ArchitecturePlanExecutionPlanDto {
  @ApiProperty({ description: 'Suggested SDLC phases', type: [String], example: ['design', 'construction'] })
  @IsArray()
  @IsString({ each: true })
  suggested_sdlc_phases!: string[];

  @ApiProperty({ description: 'Mandatory gates', type: [String], example: ['architecture-planning-gate'] })
  @IsArray()
  @IsString({ each: true })
  mandatory_gates!: string[];

  @ApiProperty({ description: 'Suggested ADRs', type: [String], example: ['adr-0101'] })
  @IsArray()
  @IsString({ each: true })
  suggested_adrs!: string[];

  @ApiProperty({ description: 'Applicable policies', type: [String], example: ['data-residency'] })
  @IsArray()
  @IsString({ each: true })
  applicable_policies!: string[];
}

/** A single audit-trail comment. */
export class ArchitecturePlanCommentDto {
  @ApiProperty({ description: 'Comment author', example: 'winston' })
  @IsString()
  author!: string;

  @ApiProperty({ description: 'Comment text' })
  @IsString()
  text!: string;

  @ApiProperty({ description: 'ISO-8601 timestamp', example: '2026-07-12T00:00:00.000Z' })
  @IsString()
  timestamp!: string;
}

/** Provenance of the draft (who/when + comments). */
export class ArchitecturePlanAuditTrailDto {
  @ApiProperty({ description: 'Creator identity', example: 'system' })
  @IsString()
  created_by!: string;

  @ApiProperty({ description: 'ISO-8601 creation timestamp', example: '2026-07-12T00:00:00.000Z' })
  @IsString()
  created_at!: string;

  @ApiProperty({ description: 'Review comments', type: [ArchitecturePlanCommentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArchitecturePlanCommentDto)
  comments!: ArchitecturePlanCommentDto[];
}

/**
 * Validated request body for `POST /api/v1/architecture-plans/evaluate`.
 *
 * Mirrors the `ArchitecturePlan` draft the CLI/Tracker submits. The Core is
 * stateless (ADR-0101): it evaluates the draft through the engine and returns
 * the enriched plan; nothing is persisted. Only `title` and `scope` are
 * required to run an evaluation — every other field is an optional draft input.
 */
export class EvaluateArchitecturePlanDto {
  @ApiPropertyOptional({ description: 'Plan identifier (assigned by the caller, if any)' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ description: 'Draft version', example: 1 })
  @IsOptional()
  @IsInt()
  version?: number;

  @ApiPropertyOptional({ description: 'Plan status', enum: ArchitecturePlanStatus, example: ArchitecturePlanStatus.DRAFT })
  @IsOptional()
  @IsEnum(ArchitecturePlanStatus)
  status?: ArchitecturePlanStatus;

  @ApiProperty({ description: 'Human-readable plan title', example: 'Introduce billing bounded context' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional({ description: 'Source prompt that generated the draft' })
  @IsOptional()
  @IsString()
  prompt_source?: string;

  @ApiProperty({ description: 'Functional/technical scope', type: ArchitecturePlanScopeDto })
  // `@ValidateNested()` alone does NOT reject an absent value — without `@IsDefined()`
  // a payload omitting `scope` passes the global ValidationPipe despite `scope!`.
  @IsDefined()
  @ValidateNested()
  @Type(() => ArchitecturePlanScopeDto)
  scope!: ArchitecturePlanScopeDto;

  @ApiPropertyOptional({ description: 'Impacted components/interfaces', type: ArchitecturePlanImpactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ArchitecturePlanImpactDto)
  impact?: ArchitecturePlanImpactDto;

  @ApiPropertyOptional({ description: 'Risk assessment', type: ArchitecturePlanRiskAssessmentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ArchitecturePlanRiskAssessmentDto)
  risk_assessment?: ArchitecturePlanRiskAssessmentDto;

  @ApiPropertyOptional({ description: 'Governance outcome (advisory)', type: ArchitecturePlanGovernanceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ArchitecturePlanGovernanceDto)
  governance?: ArchitecturePlanGovernanceDto;

  @ApiPropertyOptional({ description: 'Suggested execution plan', type: ArchitecturePlanExecutionPlanDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ArchitecturePlanExecutionPlanDto)
  execution_plan?: ArchitecturePlanExecutionPlanDto;

  @ApiPropertyOptional({ description: 'Audit trail / provenance', type: ArchitecturePlanAuditTrailDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ArchitecturePlanAuditTrailDto)
  audit_trail?: ArchitecturePlanAuditTrailDto;
}
