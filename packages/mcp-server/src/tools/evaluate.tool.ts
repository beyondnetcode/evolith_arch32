import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { RulesetValidatorService } from '@evolith/core';
import { createSuccessEnvelope } from '@evolith/core-domain';
import {
  EvaluationOrchestrator,
  type EvaluationContext,
  type IEvaluationPipeline,
  type IWorkspaceReferenceResolver,
} from '@evolith/core-domain/evaluation';
import { McpTool, McpToolSchema } from '../mcp/tool.interface';

const CORE_VERSION = '1.0.5';

/**
 * `evolith-evaluate` (core.evaluate) — MCP surface of the stateless Core
 * Evaluation Engine (GT-378 / ADR-0101), at parity (BR-008) with
 * `POST /api/v1/evaluate` and the `evolith evaluate` CLI command.
 *
 * Accepts a canonical EvaluationContext and returns an EvaluationResult in the
 * ADR-0073 envelope. Locally (trusted), `workspaceRef` is a local path.
 */
@Injectable()
export class EvaluateTool implements McpTool {
  readonly schema: McpToolSchema = {
    name: 'evolith-evaluate',
    description:
      'Evaluate a canonical EvaluationContext (gates, artifacts, rules, compliance) and return an EvaluationResult (ADR-0073 envelope). Stateless: product/tenant/initiative are opaque context only.',
    inputSchema: {
      type: 'object',
      properties: {
        kinds: { type: 'array', items: { type: 'string' }, description: "Evaluation kinds (e.g. ['gate','compliance'])" },
        workspaceRef: { type: 'string', description: 'Opaque workspace reference (locally: a path). Default: cwd.' },
        corePath: { type: 'string', description: 'Optional explicit path to the Evolith Core repository' },
        tenant: { type: 'object', description: 'Opaque tenant context { tenantId }' },
        product: { type: 'object', description: 'Opaque product context { productId }' },
        initiative: { type: 'object', description: 'Opaque initiative context { initiativeId }' },
        phaseId: { type: 'string', description: 'Canonical SDLC phase id (discovery|design|construction|qa|release)' },
        gateId: { type: 'string', description: 'Gate id to evaluate' },
        rulesetRef: { type: 'string', description: 'Versioned ruleset reference' },
        topologyRef: { type: 'string', description: 'Topology reference/override' },
        executionMode: { type: 'string', description: 'manual | hybrid | agentic' },
        correlationId: { type: 'string', description: 'Consumer correlation id (echoed)' },
      },
      required: [],
    },
  };

  constructor(private readonly validator: RulesetValidatorService) {}

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const corePath = args.corePath as string | undefined;

    const ctx: EvaluationContext = {
      kinds: (args.kinds as EvaluationContext['kinds']) ?? ['gate', 'compliance'],
      workspaceRef: (args.workspaceRef as string) || process.cwd(),
      tenant: args.tenant as EvaluationContext['tenant'],
      product: args.product as EvaluationContext['product'],
      initiative: args.initiative as EvaluationContext['initiative'],
      phaseId: args.phaseId as EvaluationContext['phaseId'],
      gateId: args.gateId as string | undefined,
      rulesetRef: args.rulesetRef as string | undefined,
      topologyRef: args.topologyRef as string | undefined,
      executionMode: args.executionMode as EvaluationContext['executionMode'],
      correlationId: args.correlationId as string | undefined,
    };

    // Dynamically import the use case to avoid circular DI issues (matches validate.tool).
    const { ValidateSatelliteUseCase } = await import(
      '@evolith/core-domain/application/use-cases/validate-satellite.use-case'
    );
    const useCase = new ValidateSatelliteUseCase(this.validator);

    const pipeline: IEvaluationPipeline = {
      evaluate: async (manifest) => {
        const out = await useCase.execute({
          satellitePath: manifest.satellitePath,
          corePath: manifest.corePath,
          manifest,
        });
        if (!out.evaluationVerdict) {
          throw new Error('Evaluation pipeline produced no verdict');
        }
        return out.evaluationVerdict;
      },
    };

    // MCP runs locally and trusted: workspaceRef is a local path.
    const resolver: IWorkspaceReferenceResolver = {
      resolve: async (ref: string) => ({ satellitePath: path.resolve(ref), corePath }),
    };

    const orchestrator = new EvaluationOrchestrator(pipeline, resolver, CORE_VERSION);
    const result = await orchestrator.evaluate(ctx);

    return createSuccessEnvelope(result, {
      command: 'evolith-evaluate',
      executedAt: result.evaluatedAt,
      durationMs: 0,
      correlationId: result.correlationId ?? `mcp-eval-${result.evaluatedAt}`,
      schemaVersion: result.schemaVersion,
    });
  }
}
