import * as path from 'path';
import { Injectable, Inject } from '@nestjs/common';
import { RulesetValidatorService } from '@beyondnet/evolith-core';
import { createSuccessEnvelope } from '@beyondnet/evolith-core-domain';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { NestLoggerProvider } from '@beyondnet/evolith-infra-providers';
import {
  EvaluationOrchestrator,
  createDefaultKindEvaluators,
  type EvaluationContext,
  type IEvaluationPipeline,
  type IWorkspaceReferenceResolver,
} from '@beyondnet/evolith-core-domain/evaluation';
import { McpTool, McpToolSchema } from '../mcp/tool.interface';
import { FILE_SYSTEM } from '../domain/domain.tokens';

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

  constructor(
    private readonly validator: RulesetValidatorService,
    @Inject(FILE_SYSTEM) private readonly fs: IFileSystem,
  ) {}

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
      '@beyondnet/evolith-core-domain/application/use-cases/validate-satellite.use-case'
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

    // BR-008 parity: register the same KindEvaluator set as core-api so non-core
    // kinds (architecture/checkpoint/topology/blueprint/deployment) actually evaluate
    // here instead of silently returning nothing.
    const evaluators = createDefaultKindEvaluators({
      fileSystem: this.fs,
      logger: new NestLoggerProvider().createLogger('McpEvaluate'),
      resolveCorePath: () => corePath ?? process.cwd(),
      // Pass the already-wired validator (from DomainModule, which has its
      // IConfigParser). Without it the architecture evaluator built a bare
      // RulesetValidatorService and threw "IConfigParser is required", so
      // evolith-evaluate failed on every call (MCP<->CLI parity gap: the CLI
      // evaluate command passes rulesetValidator + configParser here).
      rulesetValidator: this.validator,
    });
    const orchestrator = new EvaluationOrchestrator(pipeline, resolver, CORE_VERSION, evaluators);
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
