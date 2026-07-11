import { Injectable } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { McpTool, McpToolSchema } from '../mcp/tool.interface';

/**
 * A single documentation template scaffolded by {@link DocsScaffoldTool}.
 * Mirrors the `DocTemplate` shape used by the CLI `docs` command so the two
 * surfaces stay at parity.
 */
interface DocTemplate {
  filename: string;
  content: string;
  description: string;
}

/**
 * Base documentation templates required by Evolith.
 *
 * Ported verbatim from `src/sdk/cli/src/commands/docs/docs.command.ts` — the
 * scaffold logic lives inline in the CLI (there is no core-domain use-case to
 * reuse for the template bodies), so the MCP tool mirrors the exact same set to
 * guarantee CLI/MCP parity. Keep both copies in sync when a template changes.
 */
const DEFAULT_TEMPLATES: DocTemplate[] = [
  {
    filename: 'README.md',
    description: 'Project overview and getting started',
    content: `# Project Name

## Overview
Brief description of the project.

## Getting Started
Instructions for setting up and running the project.

## Architecture
Link to architecture decision records and design documents.

## Documentation
- [AGENTS.md](./AGENTS.md) - Agent configuration
- [MASTER_INDEX.md](./MASTER_INDEX.md) - Documentation index

## License
License information.
`,
  },
  {
    filename: 'AGENTS.md',
    description: 'AI agent configuration and rules',
    content: `# Agent Configuration

## Project Context
Description of the project for AI agents.

## Rules
- Follow established coding conventions
- Maintain bilingual parity (EN/ES)
- Validate all internal links

## Conventions
- Use relative paths for internal references
- Keep documentation business-readable
- Isolate technical details in dedicated sections
`,
  },
  {
    filename: 'MASTER_INDEX.md',
    description: 'Master documentation index',
    content: `# Master Index

## Architecture
- [Architecture Overview](./reference/architecture/README.md)
- [ADR Registry](./reference/architecture/adrs/README.md)

## Governance
- [Standards](./reference/governance/standards/README.md)
- [Rulesets](./reference/governance/rulesets/README.md)

## Knowledge
- [Demo References](./reference/knowledge/demo/README.md)
`,
  },
  {
    filename: 'evolith.yaml',
    description: 'Evolith satellite contract (validated against evolith-yaml.schema.json)',
    content: `# Evolith Satellite Contract — federated governance manifest.
# Validated by the Core against schema/evolith-yaml.schema.json (apiVersion evolith.dev/v1).
apiVersion: evolith.dev/v1
kind: Satellite

metadata:
  name: my-satellite
  # Progressive-axis phase: F1=modular-monolith, F2=distributed-modules, F3=microservices.
  phase: F1
  architectureVersion: 0.1.0

spec:
  coreRef:
    version: 1.0.0
    rulesetVersion: 1.0.0

  runtime:
    language: TypeScript
    framework: NestJS

  sdlc:
    # 1=Conception 2=Design 3=Construction 4=Validation 5=Delivery
    currentPhase: 1
    gates: {}

  compliance:
    adrRegistry: []
    localAdrTagEnforcement: documented
    coverageTarget: 80
`,
  },
];

/**
 * `evolith-docs-scaffold` — scaffolds the base documentation set required by
 * Evolith (README.md, AGENTS.md, MASTER_INDEX.md, evolith.yaml) into a target
 * directory. This is the MCP-surface counterpart of the CLI `docs` command.
 *
 * Writes files to disk, so it is a mutative/`write` operation: the dispatch
 * requires `{ apply: true, approvalToken }` before it runs. Pass `dryRun: true`
 * to obtain the create/update/skip plan without writing anything.
 *
 * Returns ONLY the raw payload — the dispatch wraps it in the canonical
 * ADR-0073 output envelope `{ success, data, meta }`. Do not return an envelope
 * here (that would double-wrap the result). Errors are thrown and mapped to an
 * error envelope by the dispatch.
 */
@Injectable()
export class DocsScaffoldTool implements McpTool {
  readonly mutative = true;
  readonly scope = 'write' as const;

  readonly schema: McpToolSchema = {
    name: 'evolith-docs-scaffold',
    description:
      'Scaffold the base documentation required by Evolith (README.md, AGENTS.md, MASTER_INDEX.md, evolith.yaml) into a target directory. Mirrors the CLI `docs` command. Mutative: writes files unless dryRun is set.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Target directory where the documentation is scaffolded (defaults to the server cwd).',
        },
        template: {
          type: 'string',
          description: "Template set to scaffold: 'default' (all files) or 'minimal' (README.md + AGENTS.md).",
          default: 'default',
        },
        force: {
          type: 'boolean',
          description: 'Overwrite files that already exist (updates them instead of skipping).',
          default: false,
        },
        dryRun: {
          type: 'boolean',
          description: 'Compute the create/update/skip plan without writing any files.',
          default: false,
        },
      },
      required: [],
    },
  };

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const targetDir = (args.path as string) || process.cwd();
    const force = Boolean(args.force);
    const dryRun = Boolean(args.dryRun);
    const templates = this.getTemplates(args.template as string | undefined);

    const filesToCreate: DocTemplate[] = [];
    const filesToUpdate: DocTemplate[] = [];
    const filesSkipped: DocTemplate[] = [];

    for (const template of templates) {
      const filePath = path.join(targetDir, template.filename);
      const exists = await pathExists(filePath);

      if (exists && !force) {
        filesSkipped.push(template);
      } else if (exists && force) {
        filesToUpdate.push(template);
      } else {
        filesToCreate.push(template);
      }
    }

    if (dryRun) {
      return {
        dryRun: true,
        targetDir,
        toCreate: filesToCreate.map((t) => t.filename),
        toUpdate: filesToUpdate.map((t) => t.filename),
        skipped: filesSkipped.map((t) => t.filename),
        plan: [...filesToCreate, ...filesToUpdate].map((t) => ({
          filename: t.filename,
          description: t.description,
        })),
      };
    }

    let created = 0;
    let updated = 0;

    for (const template of filesToCreate) {
      const filePath = path.join(targetDir, template.filename);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, template.content, 'utf-8');
      created++;
    }

    for (const template of filesToUpdate) {
      const filePath = path.join(targetDir, template.filename);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, template.content, 'utf-8');
      updated++;
    }

    return {
      targetDir,
      created,
      updated,
      skipped: filesSkipped.length,
      files: [...filesToCreate, ...filesToUpdate].map((t) => t.filename),
      skippedFiles: filesSkipped.map((t) => t.filename),
    };
  }

  /** Select the template set: 'minimal' → README + AGENTS, anything else → all. */
  private getTemplates(templateName?: string): DocTemplate[] {
    if (templateName === 'minimal') {
      return DEFAULT_TEMPLATES.filter((t) => ['README.md', 'AGENTS.md'].includes(t.filename));
    }
    return DEFAULT_TEMPLATES;
  }
}

/** True when a filesystem entry exists at the given path. */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
