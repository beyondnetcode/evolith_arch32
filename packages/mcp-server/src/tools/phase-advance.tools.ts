import { randomUUID } from 'node:crypto';
import {
  EvaluateGateUseCase,
  ProposePhaseAdvanceUseCase,
  type ProposePhaseAdvanceInput,
  createErrorEnvelope,
  createSuccessEnvelope,
  isGatePhase,
  type GatePhase,
  type EvaluatorKind,
  type OutputMeta,
} from '@evolith/core';
import type { IWebhookNotifier } from '@evolith/core-domain/application/ports/webhook-notifier.port';
import { McpTool } from '../mcp/tool.interface';

/** `evolith-phase-advance` — propose an SDLC phase transition. */
export function createPhaseAdvanceTools(webhook: IWebhookNotifier): McpTool[] {
  return [
    {
      schema: {
        name: 'evolith-phase-advance',
        description: 'Propose an SDLC phase transition by evaluating the current phase exit criteria',
        inputSchema: {
          type: 'object',
          properties: {
            fromPhase: { type: 'string', description: 'Current phase (discovery, design, construction, qa, release)' },
            toPhase: { type: 'string', description: 'Target phase (discovery, design, construction, qa, release)' },
            projectPath: { type: 'string', description: 'Path to the repository' },
            evaluatedBy: { type: 'string', description: 'human, agent, or ci', default: 'agent' },
            initiative: { type: 'string', description: 'Optional initiative context' },
            tenant: { type: 'string', description: 'Optional tenant context' },
          },
          required: ['fromPhase', 'toPhase', 'projectPath'],
        },
      },
      execute: async (args) => {
        const startTime = Date.now();
        const fromPhaseRaw = args.fromPhase as string;
        const toPhaseRaw = args.toPhase as string;
        const projectPath = args.projectPath as string;
        const corePath = args.corePath as string | undefined;
        const evaluatedBy = (args.evaluatedBy as EvaluatorKind) || 'agent';
        const webhookUrl = args.webhookUrl as string | undefined;

        const context: Record<string, string> = {};
        if (args.initiative) context.initiative = args.initiative as string;
        if (args.tenant) context.tenant = args.tenant as string;

        const getMeta = (): OutputMeta => ({
          command: 'evolith phase advance',
          executedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          correlationId: randomUUID(),
          ...(Object.keys(context).length > 0 && { context }),
        });

        if (!fromPhaseRaw || !isGatePhase(fromPhaseRaw)) {
          return createErrorEnvelope('INVALID_PHASE', `Invalid or missing fromPhase: ${fromPhaseRaw}`, getMeta());
        }
        if (!toPhaseRaw || !isGatePhase(toPhaseRaw)) {
          return createErrorEnvelope('INVALID_PHASE', `Invalid or missing toPhase: ${toPhaseRaw}`, getMeta());
        }
        if (!projectPath) {
          return createErrorEnvelope('IO_ERROR', 'projectPath is required', getMeta());
        }

        try {
          const evaluateUseCase = new EvaluateGateUseCase(undefined, webhook);
          const useCase = new ProposePhaseAdvanceUseCase(evaluateUseCase);
          const input: ProposePhaseAdvanceInput = {
            fromPhase: fromPhaseRaw as GatePhase,
            toPhase: toPhaseRaw as GatePhase,
            projectPath,
            corePath,
            evaluatedBy,
            webhookUrl,
          };
          const proposal = await useCase.execute(input);
          return createSuccessEnvelope(proposal, getMeta());
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          const code = message.includes('not found') || message.includes('ENOENT') ? 'RULESET_NOT_FOUND' : 'INTERNAL_ERROR';
          return createErrorEnvelope(code, message, getMeta());
        }
      },
    },
  ];
}
