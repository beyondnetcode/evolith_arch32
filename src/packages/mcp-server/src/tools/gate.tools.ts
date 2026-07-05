import {
  EvaluateGateUseCase,
  PhaseGateValidatorService,
  type EvaluateGateInput,
  isGatePhase,
  type GatePhase,
  type EvaluatorKind,
  type IFileSystem,
  type ILogger,
} from '@beyondnet/evolith-core';
import type { IWebhookNotifier } from '@beyondnet/evolith-core-domain/application/ports/webhook-notifier.port';
import { DomainException, ErrorCodes } from '../common/errors';
import { McpTool } from '../mcp/tool.interface';

/**
 * `evolith-gate-evaluate` — evaluate a single SDLC phase gate.
 *
 * Returns the raw {@link GateEvidence} payload; the server's `handleCallTool`
 * is the single authority that wraps it in the ADR-0073 envelope. Validation
 * and not-found conditions throw a {@link DomainException} so the server maps
 * them to the correct error code.
 */
export function createGateTools(webhook: IWebhookNotifier, fs: IFileSystem, logger: ILogger): McpTool[] {
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
        const phaseRaw = args.phase as string;
        const projectPath = args.projectPath as string;
        const corePath = args.corePath as string | undefined;
        const evidenceMode = (args.evidenceMode as string) || 'full';
        const evaluatedBy = (args.evaluatedBy as EvaluatorKind) || 'agent';
        const webhookUrl = args.webhookUrl as string | undefined;

        if (!phaseRaw || !isGatePhase(phaseRaw)) {
          throw new DomainException(ErrorCodes.PHASE_INVALID, `Invalid or missing phase: ${phaseRaw}`);
        }
        if (!projectPath) {
          throw new DomainException(ErrorCodes.IO_ERROR, 'projectPath is required');
        }

        const validatorFactory = (cp?: string) => new PhaseGateValidatorService(cp, { fileSystem: fs, logger });
        const useCase = new EvaluateGateUseCase(validatorFactory, webhook);
        const input: EvaluateGateInput = {
          phase: phaseRaw as GatePhase,
          projectPath,
          corePath,
          evaluatedBy,
          webhookUrl,
        };

        try {
          const evidence = await useCase.execute(input);
          if (evidenceMode === 'summary') {
            const errors = evidence.violations.filter((v) => v.severity === 'error').length;
            const warnings = evidence.violations.filter((v) => v.severity === 'warning').length;
            return { ...evidence, violations: [], summary: { errors, warnings } };
          }
          return evidence;
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
