import { ProfileStoreReader } from '@beyondnet/evolith-core-domain/application/services';
import { createSuccessEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain';
import { DomainException, ErrorCodes } from '../common/errors';
import { McpTool } from '../mcp/tool.interface';

/**
 * GT-682 (#760) — `evolith profile` on the MCP surface, read-only.
 *
 * The CLI keeps its named profiles in a `conf` store the MCP server cannot
 * reach through the CLI package. Rather than re-deriving the file's location,
 * format and active-profile precedence here — a second copy of one fact —
 * those three concerns were extracted into core-domain's `ProfileStoreReader`
 * and the CLI `ConfigService` now delegates to the same functions. This tool
 * holds no store logic of its own.
 *
 * Only `current` and `list` are exposed. `create`, `switch` and `delete` write
 * the store, and a profile is a per-machine CLI convenience: an agent switching
 * the operator's active profile from a gateway would be an action at a
 * distance, so those stay on the CLI by design.
 */

const PROFILE_ACTIONS = ['current', 'list'] as const;
export type ProfileAction = (typeof PROFILE_ACTIONS)[number];

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

export function createProfileTools(reader: ProfileStoreReader = new ProfileStoreReader()): McpTool[] {
  return [
    {
      scope: 'read' as const,
      schema: {
        name: 'evolith-profile',
        description:
          'Read the Evolith CLI profiles from the same store `evolith profile` uses. `current` (default) returns ' +
          'the active profile — `EVOLITH_PROFILE` if set, else the stored selection, else `default` — with its ' +
          'core/satellite/tenant/initiative/select values; `list` returns every profile name and which one is active. ' +
          'Read-only: creating, switching and deleting profiles stay on the CLI. Returns the ADR-0073 success envelope.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: [...PROFILE_ACTIONS],
              description: 'Which read to perform (default: current)',
            },
          },
        },
      },
      execute: async (args) => {
        const action = (args.action as ProfileAction | undefined) ?? 'current';
        if (!PROFILE_ACTIONS.includes(action)) {
          throw new DomainException(
            ErrorCodes.VALIDATION_FAILED,
            `action must be one of: ${PROFILE_ACTIONS.join(', ')}`,
          );
        }

        try {
          if (action === 'list') {
            // Same payload the CLI prints for `profile list --format json`.
            return envelope('evolith-profile', { profiles: reader.listProfiles(), active: reader.activeProfile() });
          }
          // Same payload the CLI prints for `profile current --format json`.
          const name = reader.activeProfile();
          return envelope('evolith-profile', { name, ...reader.getProfile(name) });
        } catch (error) {
          fail('evolith-profile', error);
        }
      },
    },
  ];
}
