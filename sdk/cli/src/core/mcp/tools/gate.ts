import { IFileSystem, IConfigParser } from '../../abstractions';
import { randomUUID } from 'crypto';
// eslint-disable-next-line boundaries/element-types
import { EvaluateGateUseCase, EvaluateGateInput } from '../../../application/use-cases/evaluate-gate.use-case';
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

export function getGateTools(fs: IFileSystem, configParser: IConfigParser): IMcpToolHandler[] {
  return [
    {
      schema: {
        name: 'evolith-gate-evaluate',
        description: 'Evaluate a specific SDLC phase gate',
        inputSchema: {
          type: 'object',
          properties: {
            phase: { type: 'string', description: 'Phase identifier (discovery, design, construction, qa, release)' },
            projectPath: { type: 'string', description: 'Path to the repository to validate' },
            rulesetRef: { type: 'string', description: 'Optional ruleset reference' },
            evidenceMode: { type: 'string', description: 'full or summary', default: 'full' },
            evaluatedBy: { type: 'string', description: 'human, agent, or ci', default: 'agent' },
            initiative: { type: 'string', description: 'Optional initiative context' },
            tenant: { type: 'string', description: 'Optional tenant context' },
          },
          required: ['phase', 'projectPath'],
        },
      },
      execute: async (args) => {
        const startTime = Date.now();
        
        const phaseRaw = args.phase as string;
        const projectPath = args.projectPath as string;
        const corePath = args.corePath as string | undefined;
        const evidenceMode = (args.evidenceMode as string) || 'full';
        const evaluatedBy = (args.evaluatedBy as EvaluatorKind) || 'agent';
        const initiative = args.initiative as string | undefined;
        const tenant = args.tenant as string | undefined;
        const webhookUrl = args.webhookUrl as string | undefined;

        const context: Record<string, string> = {};
        if (initiative) context.initiative = initiative;
        if (tenant) context.tenant = tenant;
        if (phaseRaw) context.phase = phaseRaw;

        const getMeta = (): OutputMeta => ({
          command: 'evolith gate evaluate',
          executedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          correlationId: randomUUID(),
          ...(Object.keys(context).length > 0 && { context }),
        });

        if (!phaseRaw || !isGatePhase(phaseRaw)) {
          return createErrorEnvelope('INVALID_PHASE', `Invalid or missing phase: ${phaseRaw}`, getMeta());
        }

        if (!projectPath) {
          return createErrorEnvelope('IO_ERROR', 'projectPath is required', getMeta());
        }

        try {
          const useCase = new EvaluateGateUseCase(undefined, new WebhookAdapter());
          const input: EvaluateGateInput = {
            phase: phaseRaw as GatePhase,
            projectPath,
            corePath,
            evaluatedBy,
            webhookUrl,
          };

          const evidence = await useCase.execute(input);

          let data = evidence;
          if (evidenceMode === 'summary') {
            const errorCount = evidence.violations.filter(v => v.severity === 'error').length;
            const warningCount = evidence.violations.filter(v => v.severity === 'warning').length;
            data = {
              ...evidence,
              violations: [] as any,
              summary: { errors: errorCount, warnings: warningCount }
            } as any;
          }

          return createSuccessEnvelope(data, getMeta());
        } catch (error: any) {
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
