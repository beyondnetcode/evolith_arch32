/**
 * GT-312: Composable Validation MCP Tool
 * Exposes the composable validation engine as an MCP tool.
 */

import { Injectable } from '@nestjs/common';
import { McpTool, McpToolSchema } from '../mcp/tool.interface';

/**
 * `evolith-composable-validate` — validate using the composable engine with multiple modes.
 *
 * Supports SDLC, Architecture, Ruleset, ADR, and Ad-hoc validation modes.
 * Can combine multiple modes in a single call.
 */
@Injectable()
export class ComposableValidateTool implements McpTool {
  readonly schema: McpToolSchema = {
    name: 'evolith-composable-validate',
    description: 'Validate using the composable engine (GT-312). Supports multiple validation modes: SDLC, Architecture, Ruleset, ADR, Ad-hoc. Can combine modes.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the satellite repository' },
        corePath: { type: 'string', description: 'Optional path to Evolith Core repository' },
        engine: {
          type: 'string',
          description: 'Validation engine: native or opa',
          enum: ['native', 'opa'],
          default: 'native',
        },
        topology: {
          type: 'string',
          description: 'Architecture topology to validate (modular-monolith, distributed-modules, microservices, etc.)',
          enum: ['modular-monolith', 'distributed-modules', 'microservices', 'serverless', 'edge-computing', 'event-driven', 'data-mesh', 'agentic-ai'],
        },
        phase: {
          type: 'string',
          description: 'SDLC phase to validate (f1-f5)',
          enum: ['f1', 'f2', 'f3', 'f4', 'f5'],
        },
        ruleset: {
          type: 'string',
          description: 'Specific ruleset to validate (compliance-baseline, definition-of-done, etc.)',
        },
        adr: {
          type: 'string',
          description: 'ADR rules to validate (adr-0002, adr-0005, adr-0010, adr-0018, adr-0032, adr-0040, adr-0050)',
          enum: ['adr-0002', 'adr-0005', 'adr-0010', 'adr-0018', 'adr-0032', 'adr-0040', 'adr-0050'],
        },
        file: {
          type: 'string',
          description: 'Individual file to validate (ad-hoc mode)',
        },
      },
      required: ['path'],
    },
  };

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const path = args.path as string | undefined;
    const corePath = args.corePath as string | undefined;
    const engine = (args.engine as 'native' | 'opa') || 'native';
    const topology = args.topology as string | undefined;
    const phase = args.phase as string | undefined;
    const ruleset = args.ruleset as string | undefined;
    const adr = args.adr as string | undefined;
    const file = args.file as string | undefined;

    if (!path) {
      throw new Error('path is required');
    }

    const { ComposableValidationEngine } = await import('@evolith/core-domain/application/validators/modes/composable-validation-engine');
    const { SdlcValidationMode } = await import('@evolith/core-domain/application/validators/modes/sdlc-validation.mode');
    const { ArchitectureValidationMode } = await import('@evolith/core-domain/application/validators/modes/architecture-validation.mode');
    const { RulesetValidationMode } = await import('@evolith/core-domain/application/validators/modes/ruleset-validation.mode');
    const { AdrValidationMode } = await import('@evolith/core-domain/application/validators/modes/adr-validation.mode');
    const { AdhocValidationMode } = await import('@evolith/core-domain/application/validators/modes/adhoc-validation.mode');

    const engineInstance = new ComposableValidationEngine();
    engineInstance.registerMode(new SdlcValidationMode());
    engineInstance.registerMode(new ArchitectureValidationMode());
    engineInstance.registerMode(new RulesetValidationMode());
    engineInstance.registerMode(new AdrValidationMode());
    engineInstance.registerMode(new AdhocValidationMode());

    const context = {
      satellitePath: path,
      corePath,
      engine,
      topology,
      phase,
      rulesetId: ruleset,
      adrId: adr,
      filePath: file,
    };

    const result = await engineInstance.execute(context);

    return {
      tool: 'evolith-composable-validate',
      type: 'composable',
      ...result,
      timestamp: new Date().toISOString(),
    };
  }
}
