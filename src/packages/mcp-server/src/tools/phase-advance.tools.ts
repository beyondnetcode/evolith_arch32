import {
  EvaluateGateUseCase,
  ProposePhaseAdvanceUseCase,
  PhaseGateValidatorService,
  type ProposePhaseAdvanceInput,
  isGatePhase,
  type GatePhase,
  type EvaluatorKind,
  type IFileSystem,
  type ILogger,
} from '@evolith/core';
import type { IWebhookNotifier } from '@evolith/core-domain/application/ports/webhook-notifier.port';
import { DomainException, ErrorCodes } from '../common/errors';
import { McpTool } from '../mcp/tool.interface';

/**
 * `evolith-phase-advance` — propose an SDLC phase transition.
 *
 * Returns the raw proposal payload; the server's `handleCallTool` wraps it in
 * the ADR-0073 envelope. Validation and not-found conditions throw a
 * {@link DomainException} so the server maps them to the correct error code.
 */
export function createPhaseAdvanceTools(webhook: IWebhookNotifier, fs: IFileSystem, logger: ILogger): McpTool[] {
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
        const fromPhaseRaw = args.fromPhase as string;
        const toPhaseRaw = args.toPhase as string;
        const projectPath = args.projectPath as string;
        const corePath = args.corePath as string | undefined;
        const evaluatedBy = (args.evaluatedBy as EvaluatorKind) || 'agent';
        const webhookUrl = args.webhookUrl as string | undefined;

        if (!fromPhaseRaw || !isGatePhase(fromPhaseRaw)) {
          throw new DomainException(ErrorCodes.PHASE_INVALID, `Invalid or missing fromPhase: ${fromPhaseRaw}`);
        }
        if (!toPhaseRaw || !isGatePhase(toPhaseRaw)) {
          throw new DomainException(ErrorCodes.PHASE_INVALID, `Invalid or missing toPhase: ${toPhaseRaw}`);
        }
        if (!projectPath) {
          throw new DomainException(ErrorCodes.IO_ERROR, 'projectPath is required');
        }

        const validatorFactory = (cp?: string) => new PhaseGateValidatorService(cp, { fileSystem: fs, logger });
        const evaluateUseCase = new EvaluateGateUseCase(validatorFactory, webhook);
        const useCase = new ProposePhaseAdvanceUseCase(evaluateUseCase);
        const input: ProposePhaseAdvanceInput = {
          fromPhase: fromPhaseRaw as GatePhase,
          toPhase: toPhaseRaw as GatePhase,
          projectPath,
          corePath,
          evaluatedBy,
          webhookUrl,
        };

        try {
          return await useCase.execute(input);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes('not found') || message.includes('ENOENT')) {
            throw new DomainException(ErrorCodes.RULESET_NOT_FOUND, message);
          }
          throw error;
        }
      },
    },
  ];
}
