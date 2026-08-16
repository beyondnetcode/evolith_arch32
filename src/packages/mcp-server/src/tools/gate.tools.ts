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
import { resolveCorePath } from '../mcp/core-path';

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
            // GT-572: `corePath` has always been READ by execute() but was never
            // DECLARED, so an agent reading the schema had no way to learn it
            // exists. That matters for the published package: an npm consumer has
            // no Evolith Core checkout beside its cwd, so gate discovery falls back
            // to `<cwd>/../evolith` and the call fails with RULESET_NOT_FOUND. This
            // is the parameter that makes the tool usable off-repo.
            corePath: {
              type: 'string',
              description:
                'Optional explicit path to the Evolith Core repository (source of the SDLC gate '
                + 'definitions). Required when the server does not run beside a Core checkout.',
            },
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
        // GT-705 — resolve instead of forwarding `undefined`. This tool's own
        // comment already recorded the symptom: without a core path the service
        // fell back to `<cwd>/../evolith` and the call failed RULESET_NOT_FOUND.
        // Measured from a clean npm install after the corpus was bundled:
        // `evolith-validate` worked and this still did not, because nobody handed
        // it the corpus the package now carries.
        const corePath = resolveCorePath(args.corePath as string | undefined, args.projectPath as string | undefined);
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
