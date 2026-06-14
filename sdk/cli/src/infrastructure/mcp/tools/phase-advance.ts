import { IFileSystem, IConfigParser } from '../../../domain/interfaces';
import { randomUUID } from 'crypto';
import { ProposePhaseAdvanceUseCase, ProposePhaseAdvanceInput } from '../../../application/use-cases/propose-phase-advance.use-case';
import { EvaluateGateUseCase } from '../../../application/use-cases/evaluate-gate.use-case';
import {
  createErrorEnvelope,
  createSuccessEnvelope,
  isGatePhase,
  GatePhase,
  EvaluatorKind,
  OutputMeta
} from '../../../domain/gate-evidence';
import { WebhookAdapter } from '../../../infrastructure/adapters/webhook.adapter';

import { IMcpToolHandler } from '../mcp-tool.registry';

export function getPhaseAdvanceTools(fs: IFileSystem, configParser: IConfigParser): IMcpToolHandler[] {
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
        const initiative = args.initiative as string | undefined;
        const tenant = args.tenant as string | undefined;
        const webhookUrl = args.webhookUrl as string | undefined;

        const context: Record<string, string> = {};
        if (initiative) context.initiative = initiative;
        if (tenant) context.tenant = tenant;

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
          const evaluateUseCase = new EvaluateGateUseCase(undefined, new WebhookAdapter());
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
          let code: 'INTERNAL_ERROR' | 'RULESET_NOT_FOUND' = 'INTERNAL_ERROR';
          if (error?.message?.includes('not found') || error?.message?.includes('ENOENT')) {
            code = 'RULESET_NOT_FOUND';
          }
          return createErrorEnvelope(code, error instanceof Error ? error.message : String(error), getMeta());
        }
      }
    }
  ];
}
