import { randomUUID } from 'node:crypto';
import {
  EvaluateGateUseCase,
  type EvaluateGateInput,
  createErrorEnvelope,
  createSuccessEnvelope,
  isGatePhase,
  type GatePhase,
  type EvaluatorKind,
  type OutputMeta,
} from '@evolith/core';
import type { IWebhookNotifier } from '@evolith/core-domain/application/ports/webhook-notifier.port';
import { McpTool } from '../mcp/tool.interface';

/** `evolith-gate-evaluate` — evaluate a single SDLC phase gate. */
export function createGateTools(webhook: IWebhookNotifier): McpTool[] {
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
        const webhookUrl = args.webhookUrl as string | undefined;

        const context: Record<string, string> = {};
        if (args.initiative) context.initiative = args.initiative as string;
        if (args.tenant) context.tenant = args.tenant as string;
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
          const useCase = new EvaluateGateUseCase(undefined, webhook);
          const input: EvaluateGateInput = {
            phase: phaseRaw as GatePhase,
            projectPath,
            corePath,
            evaluatedBy,
            webhookUrl,
          };
          const evidence = await useCase.execute(input);

          let data: unknown = evidence;
          if (evidenceMode === 'summary') {
            const errors = evidence.violations.filter((v) => v.severity === 'error').length;
            const warnings = evidence.violations.filter((v) => v.severity === 'warning').length;
            data = { ...evidence, violations: [], summary: { errors, warnings } };
          }
          return createSuccessEnvelope(data, getMeta());
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          const code = message.includes('not found') || message.includes('ENOENT') ? 'RULESET_NOT_FOUND' : 'INTERNAL_ERROR';
          return createErrorEnvelope(code, message, getMeta());
        }
      },
    },
  ];
}
