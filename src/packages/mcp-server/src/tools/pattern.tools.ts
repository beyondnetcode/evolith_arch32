import * as path from 'node:path';
import type { IFileSystem, ILogger } from '@beyondnet/evolith-core';
import { PatternCatalogService } from '@beyondnet/evolith-core';
import type { PatternCatalogFilters, PatternCategory, PatternKind } from '@beyondnet/evolith-core';
import { createSuccessEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain';
import { DomainException, ErrorCodes } from '../common/errors';
import { McpTool } from '../mcp/tool.interface';

const PATTERN_CATEGORIES: readonly PatternCategory[] = [
  'data-ownership',
  'contracts',
  'resilience',
  'integration',
  'governance',
  'structure',
  'observability',
  'security',
  'ai-safety',
  'delivery',
];

const PATTERN_KINDS: readonly PatternKind[] = ['pattern', 'anti-pattern'];

function resolveCorePath(args: Record<string, unknown>): string {
  return (args.corePath as string) || path.join(process.cwd(), '..', 'evolith');
}

function envelope<T>(command: string, data: T) {
  const executedAt = new Date().toISOString();
  return createSuccessEnvelope(data, {
    command,
    executedAt,
    durationMs: 0,
    correlationId: `mcp-${command}-${executedAt}`,
    schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
  });
}

/**
 * Turns any catalogue failure into a `DomainException`, which
 * {@link toErrorEnvelope} maps to a genuine MCP **error** envelope.
 *
 * Deliberately NOT `createErrorEnvelope(...)` as a return value: the dispatcher
 * wraps whatever a tool RETURNS in a success envelope, so returning an error
 * envelope would ship `success: true` carrying `success: false` inside — the
 * exact defect just fixed on the CLI surface. Throwing is the only way a tool
 * reaches the error branch of the dispatcher.
 *
 * `PatternCatalogService` throws (rather than returning `[]`) when the corpus is
 * missing or scans to zero records; that message is already actionable, so it is
 * forwarded verbatim and the stack is dropped.
 */
function fail(command: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  throw new DomainException(ErrorCodes.IO_ERROR, `${command} failed: ${message}`);
}

/**
 * Canonical pattern (PAT-NNNN) tools. Every read goes through the single
 * `PatternCatalogService` reader in Core — this surface holds no catalogue
 * parsing, path probing or filtering logic of its own.
 */
export function createPatternTools(fs: IFileSystem, logger: ILogger): McpTool[] {
  const catalog = new PatternCatalogService(fs, logger);

  return [
    {
      schema: {
        name: 'evolith-pattern-list',
        description:
          'List the canonical architectural patterns and anti-patterns (PAT-NNNN) published by Evolith Core, ' +
          'optionally filtered by category, kind, applicable topology, or whether a rule already enforces them. ' +
          'Returns the records in the ADR-0073 success envelope.',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: [...PATTERN_CATEGORIES], description: 'Keep only patterns in this category' },
            kind: { type: 'string', enum: [...PATTERN_KINDS], description: 'Keep only patterns or only anti-patterns' },
            topology: { type: 'string', description: 'Keep only patterns applicable to this topology id (not-applicable excluded)' },
            enforced: { type: 'boolean', description: 'true → only patterns with at least one enforcing rule; false → only unenforced ones' },
            corePath: { type: 'string', description: 'Optional explicit path to the Evolith core repository' },
          },
        },
      },
      execute: async (args) => {
        const corePath = resolveCorePath(args);
        const category = args.category as PatternCategory | undefined;
        const kind = args.kind as PatternKind | undefined;
        if (category && !PATTERN_CATEGORIES.includes(category)) {
          throw new DomainException(
            ErrorCodes.VALIDATION_FAILED,
            `category must be one of: ${PATTERN_CATEGORIES.join(', ')}`,
          );
        }
        if (kind && !PATTERN_KINDS.includes(kind)) {
          throw new DomainException(ErrorCodes.VALIDATION_FAILED, `kind must be one of: ${PATTERN_KINDS.join(', ')}`);
        }

        const filters: PatternCatalogFilters = {};
        if (category) filters.category = category;
        if (kind) filters.kind = kind;
        if (args.topology) filters.topology = args.topology as string;
        if (args.enforced !== undefined) filters.enforced = args.enforced as boolean;
        const hasFilters = Object.keys(filters).length > 0;

        try {
          const patterns = await catalog.list(corePath, hasFilters ? filters : undefined);
          return envelope('evolith-pattern-list', {
            count: patterns.length,
            filters: hasFilters ? filters : undefined,
            patterns,
          });
        } catch (error) {
          fail('evolith-pattern-list', error);
        }
      },
    },
    {
      schema: {
        name: 'evolith-pattern-get',
        description:
          'Get one canonical pattern (PAT-NNNN) by id, case-insensitively. Returns the full record — problem, ' +
          'forces, solution, applicability per topology, governing ADRs and enforcing rules — in the ADR-0073 ' +
          'success envelope.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Pattern id, e.g. PAT-0001' },
            corePath: { type: 'string', description: 'Optional explicit path to the Evolith core repository' },
          },
          required: ['id'],
        },
      },
      execute: async (args) => {
        const id = args.id as string;
        if (!id) throw new DomainException(ErrorCodes.VALIDATION_FAILED, 'id is required');
        const corePath = resolveCorePath(args);

        let pattern;
        try {
          pattern = await catalog.get(corePath, id);
        } catch (error) {
          fail('evolith-pattern-get', error);
        }
        if (!pattern) {
          throw new DomainException(ErrorCodes.PATH_NOT_FOUND, `Canonical pattern not found: ${id}`);
        }
        return envelope('evolith-pattern-get', { id: pattern.id, pattern });
      },
    },
    {
      schema: {
        name: 'evolith-pattern-list-by-topology',
        description:
          'List the canonical patterns that apply to a topology, how strongly (required → recommended → optional) ' +
          'and — the point of the query — which rules each one imposes (`enforcedBy`). `not-applicable` entries are ' +
          'excluded. Returns the applications in the ADR-0073 success envelope.',
        inputSchema: {
          type: 'object',
          properties: {
            topology: { type: 'string', description: 'Topology id, e.g. microservices' },
            corePath: { type: 'string', description: 'Optional explicit path to the Evolith core repository' },
          },
          required: ['topology'],
        },
      },
      execute: async (args) => {
        const topology = args.topology as string;
        if (!topology) throw new DomainException(ErrorCodes.VALIDATION_FAILED, 'topology is required');
        const corePath = resolveCorePath(args);

        try {
          const applications = await catalog.listByTopology(corePath, topology);
          return envelope('evolith-pattern-list-by-topology', {
            topology,
            count: applications.length,
            applications,
          });
        } catch (error) {
          fail('evolith-pattern-list-by-topology', error);
        }
      },
    },
  ];
}
