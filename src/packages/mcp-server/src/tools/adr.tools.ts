import {
  ADRService,
  type ADRStatus,
  type CreateADRInput,
} from '@beyondnet/evolith-core-domain/domain/services/adr.service';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { McpTool } from '../mcp/tool.interface';

/**
 * MCP surface for Architecture Decision Records — parity with the CLI `adr`
 * command. Each sub-action of the CLI (list / get / create / update / matrix)
 * becomes a discrete tool, mirroring the granularity of the satellite and
 * MoSCoW tool families.
 *
 * The read tools (`list`, `get`, `matrix`) default to scope `read`. The
 * write tools (`create`, `update`) declare `mutative:true` + scope `write`,
 * so the dispatch enforces `{ apply:true, approvalToken }` before executing.
 *
 * Every `execute` returns ONLY the raw data payload — the MCP dispatch wraps
 * it in the canonical ADR-0073 envelope. Errors are thrown so the dispatch
 * maps them to an error envelope (no self-built `{success,data,meta}`).
 *
 * The handlers reuse the exact same `ADRService` from
 * `@beyondnet/evolith-core-domain` that the CLI command invokes; no ADR logic
 * is reimplemented here. This is an MCP (non-TTY) surface, so all inputs that
 * the CLI gathers via interactive prompts are provided as tool arguments.
 */
export function createAdrTools(fs: IFileSystem): McpTool[] {
  const basePathOf = (args: Record<string, unknown>): string =>
    (args.path as string) || process.cwd();

  const serviceOf = (args: Record<string, unknown>): ADRService =>
    new ADRService(fs, basePathOf(args));

  const pathProp = {
    path: {
      type: 'string',
      description: 'Repository root containing reference/architecture/adrs (defaults to cwd)',
    },
  };

  const VALID_STATUSES: ADRStatus[] = [
    'Proposed',
    'Accepted',
    'Deprecated',
    'Superseded',
    'Amended',
  ];

  return [
    {
      // Read-only listing.
      scope: 'read' as const,
      schema: {
        name: 'evolith-adr-list',
        description:
          'List all Architecture Decision Records (id, title, status, date).',
        inputSchema: {
          type: 'object',
          properties: { ...pathProp },
        },
      },
      execute: async (args) => {
        const adrs = await serviceOf(args).list();
        return {
          count: adrs.length,
          adrs: adrs.map((adr) => ({
            id: adr.id,
            title: adr.title,
            status: adr.status,
            date: adr.date,
          })),
        };
      },
    },
    {
      // Read-only fetch of a single ADR by id or number.
      scope: 'read' as const,
      schema: {
        name: 'evolith-adr-get',
        description: 'Get the full details of a single ADR by id (e.g. ADR-0001) or number.',
        inputSchema: {
          type: 'object',
          properties: {
            ...pathProp,
            id: { type: 'string', description: 'ADR id (ADR-0001) or number (1)' },
          },
          required: ['id'],
        },
      },
      execute: async (args) => {
        const id = args.id as string;
        if (!id) throw new Error('id is required');
        const adr = await serviceOf(args).get(id);
        if (!adr) throw new Error(`ADR ${id} not found`);
        return adr;
      },
    },
    {
      // Writes a new ADR markdown file + updates the matrix.
      mutative: true,
      scope: 'write' as const,
      schema: {
        name: 'evolith-adr-create',
        description:
          'Create a new Architecture Decision Record. Writes reference/architecture/adrs/<id>.md and updates the matrix.',
        inputSchema: {
          type: 'object',
          properties: {
            ...pathProp,
            title: { type: 'string', description: 'ADR title (min 5 chars)' },
            context: { type: 'string', description: 'Problem / context being addressed' },
            decision: { type: 'string', description: 'The decision that was made' },
            consequences: {
              type: 'object',
              description: 'Positive / negative / neutral consequences',
              properties: {
                positive: { type: 'array', items: { type: 'string' } },
                negative: { type: 'array', items: { type: 'string' } },
                neutral: { type: 'array', items: { type: 'string' } },
              },
            },
            relatedAdrs: {
              type: 'array',
              items: { type: 'string' },
              description: 'Ids of related ADRs',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional classification tags',
            },
            dryRun: {
              type: 'boolean',
              description: 'Simulate the creation without writing files',
              default: false,
            },
          },
          required: ['title', 'context', 'decision'],
        },
      },
      execute: async (args) => {
        const title = args.title as string;
        const context = args.context as string;
        const decision = args.decision as string;
        if (!title || title.length < 5) throw new Error('title is required (min 5 chars)');
        if (!context) throw new Error('context is required');
        if (!decision) throw new Error('decision is required');

        const rawConsequences = (args.consequences as Record<string, unknown> | undefined) ?? {};
        const consequences = {
          positive: Array.isArray(rawConsequences.positive)
            ? (rawConsequences.positive as string[])
            : [],
          negative: Array.isArray(rawConsequences.negative)
            ? (rawConsequences.negative as string[])
            : [],
          ...(Array.isArray(rawConsequences.neutral)
            ? { neutral: rawConsequences.neutral as string[] }
            : {}),
        };

        const input: CreateADRInput = {
          title,
          context,
          decision,
          consequences,
          ...(Array.isArray(args.relatedAdrs)
            ? { relatedAdrs: args.relatedAdrs as string[] }
            : {}),
          ...(Array.isArray(args.tags) ? { tags: args.tags as string[] } : {}),
        };

        const dryRun = Boolean(args.dryRun);
        const adr = await serviceOf(args).create(input, dryRun);
        return {
          dryRun,
          adr: { id: adr.id, title: adr.title, status: adr.status, date: adr.date },
        };
      },
    },
    {
      // Rewrites the ADR status in its markdown file + matrix.
      mutative: true,
      scope: 'write' as const,
      schema: {
        name: 'evolith-adr-update',
        description:
          'Update the status of an existing ADR (Proposed | Accepted | Deprecated | Superseded | Amended).',
        inputSchema: {
          type: 'object',
          properties: {
            ...pathProp,
            id: { type: 'string', description: 'ADR id (ADR-0001) or number' },
            status: {
              type: 'string',
              description: 'New status: Proposed, Accepted, Deprecated, Superseded, or Amended',
            },
            reason: { type: 'string', description: 'Optional reason for the status change' },
            dryRun: {
              type: 'boolean',
              description: 'Simulate the update without writing files',
              default: false,
            },
          },
          required: ['id', 'status'],
        },
      },
      execute: async (args) => {
        const id = args.id as string;
        const status = args.status as ADRStatus;
        if (!id) throw new Error('id is required');
        if (!status) {
          throw new Error(
            'status is required (Proposed | Accepted | Deprecated | Superseded | Amended)',
          );
        }
        if (!VALID_STATUSES.includes(status)) {
          throw new Error(
            `Invalid status "${status}". Expected one of: ${VALID_STATUSES.join(', ')}`,
          );
        }
        const reason = args.reason as string | undefined;
        const dryRun = Boolean(args.dryRun);

        const updated = await serviceOf(args).updateStatus(id, status, reason, dryRun);
        if (!updated) throw new Error(`ADR ${id} not found`);
        return { id, newStatus: status, dryRun };
      },
    },
    {
      // Read-only aggregate view.
      scope: 'read' as const,
      schema: {
        name: 'evolith-adr-matrix',
        description: 'Get the ADR matrix summary (totals by status + recent ADRs).',
        inputSchema: {
          type: 'object',
          properties: { ...pathProp },
        },
      },
      execute: async (args) => {
        return serviceOf(args).getMatrix();
      },
    },
  ];
}
