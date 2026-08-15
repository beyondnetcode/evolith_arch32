import * as path from 'path';
import { Injectable, Inject } from '@nestjs/common';
import { RulesetValidatorService } from '@beyondnet/evolith-core';
import { createSuccessEnvelope } from '@beyondnet/evolith-core-domain';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import {
  NestLoggerProvider,
  createEvaluationIngestClientFromEnv,
  depositEvaluation,
  loadCodeownersFromWorkspace,
  openWaiverStoreForRead,
} from '@beyondnet/evolith-infra-providers';
import {
  EvaluationOrchestrator,
  createDefaultKindEvaluators,
  evaluateDriftGate,
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
        waiverStore: {
          type: 'string',
          description:
            'Optional waiver store path (default: <workspaceRef>/.evolith/waivers.json). Read-only: this tool honours approved waivers, it cannot create or approve them (GT-677).',
        },
        tenant: { type: 'object', description: 'Opaque tenant context { tenantId }' },
        product: { type: 'object', description: 'Opaque product context { productId }' },
        initiative: { type: 'object', description: 'Opaque initiative context { initiativeId }' },
        phaseId: { type: 'string', description: 'Canonical SDLC phase id (discovery|design|construction|qa|release)' },
        gateId: { type: 'string', description: 'Gate id to evaluate' },
        rulesetRef: { type: 'string', description: 'Versioned ruleset reference' },
        topologyRef: { type: 'string', description: 'Topology reference/override (single-element shorthand for design.topologyConfirmedRefs)' },
        design: {
          type: 'object',
          description:
            'Design facet (ADR-0104). Carries the confirmed topology composition as design.topologyConfirmedRefs: string[]. Same field and shape the REST EvaluationContextDto accepts (GT-688).',
        },
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
      // GT-688: MCP could not express a composition at all — the handler maps
      // field by field with no spread, so anything not listed is dropped in
      // silence (there is no argument validation at dispatch).
      design: args.design as EvaluationContext['design'],
      executionMode: args.executionMode as EvaluationContext['executionMode'],
      correlationId: args.correlationId as string | undefined,
    };

    // Dynamically import the use case to avoid circular DI issues (matches validate.tool).
    const { ValidateSatelliteUseCase } = await import(
      '@beyondnet/evolith-core-domain/application/use-cases/validate-satellite.use-case'
    );
    const useCase = new ValidateSatelliteUseCase(this.validator);

    const pipeline: IEvaluationPipeline = {
      // GT-614: same forwarding as the CLI, so MCP parity holds for what a
      // single-kind request executes, not only for what it returns.
      evaluate: async (manifest, plan) => {
        const out = await useCase.execute({
          satellitePath: manifest.satellitePath,
          corePath: manifest.corePath,
          manifest,
          plan,
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

    const correlationId = result.correlationId ?? `mcp-eval-${result.evaluatedAt}`;

    // GT-604: deposit this verdict in the Tracker's evidence ledger through the SAME
    // shared client the CLI and the drift gate use, so the three surfaces cannot
    // disagree about the wire shape. `undefined` when this installation is not
    // configured to talk to a Tracker — a standalone run, not a failure — and a
    // failed deposit never changes what this tool returns: an agent must not see a
    // different verdict because a ledger was down.
    // GT-677: same workspace anchor the CLI uses. MCP runs against a local path
    // (`workspaceRef`, defaulted above), so a file-backed store is meaningful here.
    const workspaceRoot = path.resolve(ctx.workspaceRef ?? process.cwd());

    await depositEvaluation({
      client: createEvaluationIngestClientFromEnv(process.env),
      result,
      // The canonical, owner-enriched violation set — the same one the drift gate
      // blocks on, so the ledger's accountable owner is the one a PR comment names.
      // GT-677: `codeowners` was missing (the comment above was false) and `waivers`
      // was missing (an approved waiver never reached the ledger's frozen bit).
      violations: evaluateDriftGate({
        result,
        codeowners: loadCodeownersFromWorkspace(workspaceRoot),
        waivers: openWaiverStoreForRead(workspaceRoot, args.waiverStore as string | undefined),
      }).evidence.violations,
      surface: 'mcp',
      producerVersion: `evolith-mcp@${CORE_VERSION}`,
      correlationId,
    });

    return createSuccessEnvelope(result, {
      command: 'evolith-evaluate',
      executedAt: result.evaluatedAt,
      durationMs: 0,
      correlationId,
      schemaVersion: result.schemaVersion,
    });
  }
}
