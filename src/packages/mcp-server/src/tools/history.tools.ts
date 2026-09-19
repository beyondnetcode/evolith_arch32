import { CommandHistoryService } from '@beyondnet/evolith-core-domain/application/services/services/command-history.service';
import type { HistoryEntry } from '@beyondnet/evolith-core-domain/application/services/services/command-history.service';
import { createSuccessEnvelope, measuredMeta, startEnvelopeClock } from '@beyondnet/evolith-core-domain';
import type { EnvelopeClock } from '@beyondnet/evolith-core-domain';
import { DomainException, ErrorCodes } from '../common/errors';
import { McpTool } from '../mcp/tool.interface';

/**
 * GT-682 (#759) — `evolith history` on the MCP surface.
 *
 * The CLI command is one command with four read modes selected by flags
 * (`--stats`, `--get <id>`, `--search <query>`, and the default listing with
 * `--limit`), so this is ONE tool with an `action`. The two write modes the CLI
 * also has — `--clear` and `--replay` — are deliberately NOT here: this slice is
 * read-only, and `replay` is a CLI affordance (it prints a command line to
 * paste) with no meaning for an agent.
 *
 * Every read goes through the same `CommandHistoryService` the CLI uses, over
 * the same file (`$HOME/.evolith/history.jsonl`): no history parsing, filtering
 * or statistics lives on this surface.
 */

const HISTORY_ACTIONS = ['list', 'get', 'search', 'stats'] as const;
export type HistoryAction = (typeof HISTORY_ACTIONS)[number];

/** The CLI's default for `--limit`; mirrored so `list` with no arguments agrees across surfaces. */
export const HISTORY_DEFAULT_LIMIT = 20;

/**
 * How the tool obtains a history reader. Injectable so the spec can point it at
 * a fixture file; the module wires the default (the CLI's own location). A NEW
 * service per call — `CommandHistoryService` caches the file on first read,
 * and a long-lived server must see entries the CLI wrote after boot.
 */
export type HistoryServiceFactory = () => CommandHistoryService;

// GT-686 — `durationMs` is read from the clock the tool started, never a literal.
function envelope<T>(command: string, clock: EnvelopeClock, data: T) {
  return createSuccessEnvelope(
    data,
    measuredMeta(clock, { command, correlationId: `mcp-${command}-${clock.executedAt}` }),
  );
}

/**
 * Thrown, never returned: the dispatcher wraps whatever a tool RETURNS in a
 * success envelope, so a returned error envelope would ship `success: true`
 * around `success: false`. Throwing is the only way to reach its error branch.
 */
function fail(command: string, error: unknown): never {
  if (error instanceof DomainException) throw error;
  const message = error instanceof Error ? error.message : String(error);
  throw new DomainException(ErrorCodes.IO_ERROR, `${command} failed: ${message}`);
}

function parseLimit(raw: unknown): number {
  if (raw === undefined || raw === null) return HISTORY_DEFAULT_LIMIT;
  const limit = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new DomainException(ErrorCodes.VALIDATION_FAILED, 'limit must be a positive integer');
  }
  return limit;
}

export function createHistoryTools(
  historyServiceFactory: HistoryServiceFactory = () => new CommandHistoryService(),
): McpTool[] {
  return [
    {
      scope: 'read' as const,
      schema: {
        name: 'evolith-history',
        description:
          'Read the Evolith CLI command history ($HOME/.evolith/history.jsonl), the same store `evolith history` ' +
          'reads. `list` (default) returns the most recent entries, newest first; `get` one entry by id; `search` the ' +
          'entries whose command or arguments contain a query; `stats` the totals, success rate and most-used commands. ' +
          'Read-only: clearing or replaying history stays on the CLI. Returns the ADR-0073 success envelope.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: [...HISTORY_ACTIONS],
              description: 'Which read to perform (default: list)',
            },
            limit: {
              type: 'number',
              description: `list: number of most recent entries to return (default: ${HISTORY_DEFAULT_LIMIT})`,
            },
            id: { type: 'string', description: 'get: the entry id, e.g. h-000042' },
            query: { type: 'string', description: 'search: case-insensitive text matched against command and arguments' },
          },
        },
      },
      execute: async (args) => {
        const clock = startEnvelopeClock();
        const action = (args.action as HistoryAction | undefined) ?? 'list';
        if (!HISTORY_ACTIONS.includes(action)) {
          throw new DomainException(
            ErrorCodes.VALIDATION_FAILED,
            `action must be one of: ${HISTORY_ACTIONS.join(', ')}`,
          );
        }

        // Argument checks BEFORE the store is touched: a bad `limit` must fail
        // as a bad `limit`, not as an unreadable history file.
        const limit = action === 'list' ? parseLimit(args.limit) : HISTORY_DEFAULT_LIMIT;
        const id = typeof args.id === 'string' ? args.id.trim() : '';
        const query = typeof args.query === 'string' ? args.query : '';
        if (action === 'get' && !id) {
          throw new DomainException(ErrorCodes.VALIDATION_FAILED, 'id is required for action "get"');
        }
        if (action === 'search' && !query.trim()) {
          throw new DomainException(ErrorCodes.VALIDATION_FAILED, 'query is required for action "search"');
        }

        const history = historyServiceFactory();
        try {
          switch (action) {
            case 'stats':
              return envelope('evolith-history', clock, await history.stats());
            case 'get': {
              const entry: HistoryEntry | undefined = await history.get(id);
              if (!entry) {
                throw new DomainException(ErrorCodes.PATH_NOT_FOUND, `Entry not found: ${id}`);
              }
              return envelope('evolith-history', clock, entry);
            }
            case 'search':
              return envelope('evolith-history', clock, await history.search(query));
            case 'list':
            default:
              return envelope('evolith-history', clock, await history.list(limit));
          }
        } catch (error) {
          fail('evolith-history', error);
        }
      },
    },
  ];
}
