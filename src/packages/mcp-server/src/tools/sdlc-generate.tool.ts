import { Injectable } from '@nestjs/common';
import * as path from 'node:path';
import { readFile } from 'node:fs/promises';
import {
  parseDddModel,
  type ClassDiagram,
} from '@beyondnet/evolith-core-domain/application/generators/mermaid-class-parser';
import { scaffoldHexagonal } from '@beyondnet/evolith-core-domain/application/generators/hexagonal-scaffolder';
import { McpTool, McpToolSchema } from '../mcp/tool.interface';

/**
 * `evolith-sdlc-generate` — MCP parity for the CLI `sdlc generate` command.
 *
 * Generates a Hexagonal Architecture scaffold from a Mermaid `classDiagram`
 * embedded in a Markdown DDD model, reusing the exact same core-domain
 * generators the CLI uses (`parseDddModel` + `scaffoldHexagonal`). No business
 * logic is reimplemented here — this tool is a thin transport adapter.
 *
 * The DDD model can be supplied either as an inline Markdown string (`model`)
 * or as a filesystem path (`from`). At least one is required. When `dryRun` is
 * true the scaffolder reports what it would create without writing any file.
 *
 * Writes files to disk → declared `mutative` with `write` scope, so the MCP
 * dispatch requires `{ apply:true, approvalToken }` before execution.
 *
 * Returns ONLY the raw payload; the dispatch wraps it in the canonical
 * ADR-0073 output envelope. Errors are thrown and mapped to an error envelope.
 */
@Injectable()
export class SdlcGenerateTool implements McpTool {
  readonly mutative = true;
  readonly scope = 'write' as const;

  readonly schema: McpToolSchema = {
    name: 'evolith-sdlc-generate',
    description:
      'Generate a Hexagonal Architecture scaffold from a Mermaid classDiagram in a Markdown DDD model (parity with the CLI `sdlc generate`). Supply the model inline via `model` or as a file via `from`. Writes files unless `dryRun` is true.',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description:
            'Inline Markdown DDD model content containing a ```mermaid classDiagram block. Alternative to `from`.',
        },
        from: {
          type: 'string',
          description:
            'Path to a Markdown DDD model file containing a Mermaid classDiagram. Resolved against `output` (or cwd). Alternative to `model`.',
        },
        output: {
          type: 'string',
          description:
            'Target directory for generated files (default: current working directory).',
        },
        dryRun: {
          type: 'boolean',
          description:
            'When true, report the files that would be created without writing anything.',
          default: false,
        },
      },
      required: [],
    },
  };

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const inlineModel = args.model as string | undefined;
    const fromFile = args.from as string | undefined;
    const dryRun = Boolean(args.dryRun);
    const targetDir = path.resolve(
      process.cwd(),
      (args.output as string | undefined) ?? '.',
    );

    if (!inlineModel && !fromFile) {
      throw new Error('Either `model` (inline Markdown) or `from` (file path) must be provided.');
    }

    // ── 1. Obtain the Markdown DDD model ─────────────────────────────────────
    let markdown: string;
    if (inlineModel) {
      markdown = inlineModel;
    } else {
      const modelPath = path.resolve(targetDir, fromFile as string);
      try {
        markdown = await readFile(modelPath, 'utf-8');
      } catch {
        throw new Error(`Model file not found: ${modelPath}`);
      }
    }

    // ── 2. Parse the Mermaid classDiagram (core-domain) ──────────────────────
    const diagram: ClassDiagram | null = parseDddModel(markdown);
    if (!diagram) {
      throw new Error(
        'No valid Mermaid classDiagram found in the model. Ensure the content contains a ```mermaid block with a classDiagram directive.',
      );
    }

    // ── 3. Scaffold the hexagonal architecture (core-domain) ─────────────────
    const result = await scaffoldHexagonal(diagram, targetDir, dryRun);

    // Return the raw payload only — the dispatch wraps it in the ADR-0073
    // envelope. A pre-built {success,data,meta} here would double-wrap.
    return {
      targetDir,
      dryRun,
      diagram: {
        classCount: diagram.classes.length,
        relationshipCount: diagram.relationships.length,
        classes: diagram.classes.map((c) => ({
          name: c.name,
          stereotype: c.stereotype,
        })),
      },
      created: result.created,
      skipped: result.skipped,
    };
  }
}
