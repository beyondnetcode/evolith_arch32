import { StandardsService } from '@beyondnet/evolith-core-domain/domain/services/standards.service';
import type { StandardCategory } from '@beyondnet/evolith-core-domain/domain/services/standards.service';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { createSuccessEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain';
import { DomainException, ErrorCodes } from '../common/errors';
import { McpTool } from '../mcp/tool.interface';

/**
 * GT-682 (#761) — `evolith standards` on the MCP surface, read-only.
 *
 * The CLI command reads `<cwd>/reference/standards/standards-index.json`
 * through core-domain's `StandardsService`; so does this tool, over the same
 * service, with the workspace root taken from `path` (defaulting to the
 * server's cwd exactly as the CLI defaults to its own — the same convention
 * `evolith-adr-*` already follows for repository-local corpora).
 *
 * Exposed: `list` (optional `category` filter) and `get` (by id). NOT exposed:
 * `--init` (writes the directory skeleton), `--validate` (runs code through the
 * standards' checks — a distinct evaluation surface, not a catalogue read) and
 * `--export` (renders one standard to Markdown/JSON for a file, which `get`
 * already answers in structured form).
 */

const STANDARDS_ACTIONS = ['list', 'get'] as const;
export type StandardsAction = (typeof STANDARDS_ACTIONS)[number];

/** Mirrors `StandardCategory` in core-domain; kept as a literal list so the input schema can enumerate it. */
const STANDARD_CATEGORIES: readonly StandardCategory[] = ['architecture', 'governance', 'operations', 'infrastructure'];

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

/** Thrown, never returned — see `history.tools.ts`. */
function fail(command: string, error: unknown): never {
  if (error instanceof DomainException) throw error;
  const message = error instanceof Error ? error.message : String(error);
  throw new DomainException(ErrorCodes.IO_ERROR, `${command} failed: ${message}`);
}

export function createStandardsTools(fs: IFileSystem): McpTool[] {
  return [
    {
      scope: 'read' as const,
      schema: {
        name: 'evolith-standards',
        description:
          'Read the corporate standards registered under <path>/reference/standards (the index `evolith standards` ' +
          'reads). `list` (default) returns id/name/version/category/rulesCount per standard, optionally filtered by ' +
          'category; `get` returns one standard in full, rules included. Read-only: init, validate and export stay on ' +
          'the CLI. Returns the ADR-0073 success envelope.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: [...STANDARDS_ACTIONS],
              description: 'Which read to perform (default: list)',
            },
            category: {
              type: 'string',
              enum: [...STANDARD_CATEGORIES],
              description: 'list: keep only standards in this category',
            },
            id: { type: 'string', description: 'get: the standard id' },
            path: {
              type: 'string',
              description: 'Workspace root containing reference/standards (defaults to the server cwd)',
            },
          },
        },
      },
      execute: async (args) => {
        const action = (args.action as StandardsAction | undefined) ?? 'list';
        if (!STANDARDS_ACTIONS.includes(action)) {
          throw new DomainException(
            ErrorCodes.VALIDATION_FAILED,
            `action must be one of: ${STANDARDS_ACTIONS.join(', ')}`,
          );
        }
        const category = args.category as StandardCategory | undefined;
        if (category !== undefined && !STANDARD_CATEGORIES.includes(category)) {
          throw new DomainException(
            ErrorCodes.VALIDATION_FAILED,
            `category must be one of: ${STANDARD_CATEGORIES.join(', ')}`,
          );
        }
        const id = typeof args.id === 'string' ? args.id.trim() : '';
        if (action === 'get' && !id) {
          throw new DomainException(ErrorCodes.VALIDATION_FAILED, 'id is required for action "get"');
        }

        const basePath = (args.path as string | undefined)?.trim() || process.cwd();
        const service = new StandardsService(fs, basePath);

        try {
          if (action === 'get') {
            const standard = await service.get(id);
            if (!standard) {
              throw new DomainException(ErrorCodes.PATH_NOT_FOUND, `Standard ${id} not found`);
            }
            return envelope('evolith-standards', standard);
          }
          // Same projection the CLI prints for `standards --list --format json`.
          const standards = await service.list(category);
          return envelope('evolith-standards', {
            count: standards.length,
            standards: standards.map((s) => ({
              id: s.id,
              name: s.name,
              version: s.version,
              category: s.category,
              rulesCount: s.rules.length,
            })),
          });
        } catch (error) {
          fail('evolith-standards', error);
        }
      },
    },
  ];
}
