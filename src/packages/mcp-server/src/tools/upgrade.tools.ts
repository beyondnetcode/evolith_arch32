import type { IFileSystem, ILogger } from '@beyondnet/evolith-core';
import { SatelliteUpgradeService } from '@beyondnet/evolith-core-domain/application/upgrade/satellite-upgrade.service';
import { McpTool } from '../mcp/tool.interface';

/**
 * Satellite upgrade tools — MCP parity with the CLI `upgrade` command.
 *
 * The CLI command has two effective behaviors: a read-only plan/dry-run and a
 * mutative apply. Because a single MCP tool cannot be both `read` and
 * `mutative`, this factory exposes them as two tools:
 *
 *   - `evolith-upgrade-plan`  (read)     → `planUpgrade` — never touches disk.
 *   - `evolith-upgrade-apply` (mutative) → `executeUpgrade` — writes files, so
 *     the dispatch demands `{ apply:true, approvalToken }`.
 *
 * Both delegate to the shared {@link SatelliteUpgradeService} from
 * `@beyondnet/evolith-core-domain` — the exact same service the CLI command
 * constructs (`upgrade.command.ts`). No logic is reimplemented here.
 *
 * Path resolution mirrors the CLI defaults without the interactive resolver:
 * `satellitePath` defaults to `process.cwd()`, and `corePath` defaults to
 * `satellitePath` (the CLI's `findCorePath` returns the satellite path).
 *
 * Each `execute` returns ONLY the raw data payload — the server dispatch is the
 * single authority that wraps it in the ADR-0073 `{ success, data, meta }`
 * envelope. Failures are thrown so the dispatch maps them to an error envelope.
 */
export function createUpgradeTools(fs: IFileSystem, logger: ILogger): McpTool[] {
  const service = new SatelliteUpgradeService({ fileSystem: fs, logger });

  const satelliteOf = (args: Record<string, unknown>): string =>
    (args.satellitePath as string) || (args.path as string) || process.cwd();

  const coreOf = (args: Record<string, unknown>, satellitePath: string): string =>
    (args.corePath as string) || (args.core as string) || satellitePath;

  return [
    {
      // Read-only: computes the diff/plan (and an optional dry-run) without
      // mutating the satellite. Default scope 'read'.
      schema: {
        name: 'evolith-upgrade-plan',
        description:
          'Plan a satellite upgrade against the upstream Evolith core (read-only / dry-run). Computes the change plan, breaking changes and estimated risk without writing any files.',
        inputSchema: {
          type: 'object',
          properties: {
            satellitePath: {
              type: 'string',
              description: 'Path to the satellite project (defaults to the current working directory)',
            },
            corePath: {
              type: 'string',
              description: 'Path to the Evolith core repository (defaults to the satellite path)',
            },
          },
          required: [],
        },
      },
      execute: async (args: Record<string, unknown>): Promise<unknown> => {
        const satellitePath = satelliteOf(args);
        const corePath = coreOf(args, satellitePath);

        const plan = await service.planUpgrade({ satellitePath, corePath });

        if (plan.changes.length === 0) {
          return {
            upToDate: true,
            plan,
            message: 'Satellite is already up to date',
          };
        }

        return {
          upToDate: false,
          dryRun: true,
          plan,
          breakingChanges: plan.breakingChanges.length,
          message: `Dry run complete — ${plan.changes.length} change(s) planned, no changes applied`,
        };
      },
    },
    {
      // Writes files into the satellite → mutative. The dispatch requires
      // { apply:true, approvalToken } before this runs.
      mutative: true,
      scope: 'write' as const,
      schema: {
        name: 'evolith-upgrade-apply',
        description:
          'Apply a satellite upgrade from the upstream Evolith core. Writes files into the satellite. Set force=true to proceed when breaking changes are detected.',
        inputSchema: {
          type: 'object',
          properties: {
            satellitePath: {
              type: 'string',
              description: 'Path to the satellite project (defaults to the current working directory)',
            },
            corePath: {
              type: 'string',
              description: 'Path to the Evolith core repository (defaults to the satellite path)',
            },
            force: {
              type: 'boolean',
              description: 'Apply the upgrade even when breaking changes are detected (default false)',
              default: false,
            },
            skipBackup: {
              type: 'boolean',
              description: 'Skip creating a backup before applying changes (default false)',
              default: false,
            },
          },
          required: [],
        },
      },
      execute: async (args: Record<string, unknown>): Promise<unknown> => {
        const satellitePath = satelliteOf(args);
        const corePath = coreOf(args, satellitePath);
        const force = Boolean(args.force);
        const skipBackup = Boolean(args.skipBackup);

        const result = await service.executeUpgrade({
          satellitePath,
          corePath,
          force,
          skipBackup,
        });

        const report = await service.getUpgradeReport(result);

        return { result, report };
      },
    },
  ];
}
