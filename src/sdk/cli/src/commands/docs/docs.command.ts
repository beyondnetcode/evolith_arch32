import { Command, Option } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { createSuccessEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';

interface DocsCommandOptions {
  dryRun?: boolean;
  force?: boolean;
  template?: string;
  format?: string;
}

interface DocTemplate {
  filename: string;
  content: string;
  description: string;
}

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

@Command({
  name: 'docs',
  description: 'Scaffolds base documentation required by Evolith',
})
export class DocsCommand extends BaseEvolithCommand {
  constructor() {
    super('DocsCommand');
  }

  async executeCommand(passedParam: string[], options?: DocsCommandOptions): Promise<void> {
    const dryRun = options?.dryRun || false;
    const force = options?.force || false;
    const json = options?.format === 'json';
    const commandId = 'evolith docs scaffold';
    const startedAt = Date.now();
    const meta = {
      command: commandId,
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    const targetDir = process.cwd();
    const templates = this.getTemplates(options?.template);
    const filesToCreate: DocTemplate[] = [];
    const filesToUpdate: DocTemplate[] = [];
    const filesSkipped: DocTemplate[] = [];

    for (const template of templates) {
      const filePath = path.join(targetDir, template.filename);
      const exists = await fs.pathExists(filePath);

      if (exists && !force) {
        filesSkipped.push(template);
      } else if (exists && force) {
        filesToUpdate.push(template);
      } else {
        filesToCreate.push(template);
      }
    }

    if (filesToCreate.length === 0 && filesToUpdate.length === 0) {
      if (json) {
        console.log(JSON.stringify(createSuccessEnvelope({
          created: 0,
          updated: 0,
          skipped: filesSkipped.length,
          files: filesSkipped.map(t => t.filename),
        }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        return;
      }
      this.promptService.showInfo('All documentation files already exist. Use --force to overwrite.');
      this.promptService.showOutro(chalk.yellow('No changes made.'));
      return;
    }

    if (json) {
      let created = 0;
      let updated = 0;

      for (const template of filesToCreate) {
        const filePath = path.join(targetDir, template.filename);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, template.content, 'utf-8');
        created++;
      }

      for (const template of filesToUpdate) {
        const filePath = path.join(targetDir, template.filename);
        await fs.writeFile(filePath, template.content, 'utf-8');
        updated++;
      }

      console.log(JSON.stringify(createSuccessEnvelope({
        created,
        updated,
        skipped: filesSkipped.length,
        files: [...filesToCreate, ...filesToUpdate].map(t => t.filename),
      }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      return;
    }

    this.promptService.showIntro('Evolith SDK - Document Scaffold');

    this.promptService.showInfo(`Files to create: ${filesToCreate.length}`);
    this.promptService.showInfo(`Files to update: ${filesToUpdate.length}`);
    this.promptService.showInfo(`Files skipped: ${filesSkipped.length}`);

    if (dryRun) {
      this.promptService.showInfo(chalk.cyan('[DRY RUN] No files will be written.'));
      for (const t of [...filesToCreate, ...filesToUpdate]) {
        this.promptService.showInfo(`  ${chalk.green('+')} ${t.filename} - ${t.description}`);
      }
      this.promptService.showOutro(chalk.green('Dry run completed.'));
      return;
    }

    let created = 0;
    let updated = 0;

    for (const template of filesToCreate) {
      const filePath = path.join(targetDir, template.filename);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, template.content, 'utf-8');
      this.promptService.showSuccess(`Created: ${template.filename}`);
      created++;
    }

    for (const template of filesToUpdate) {
      const filePath = path.join(targetDir, template.filename);
      await fs.writeFile(filePath, template.content, 'utf-8');
      this.promptService.showSuccess(`Updated: ${template.filename}`);
      updated++;
    }

    this.promptService.showOutro(chalk.green(`Documentation scaffolded: ${created} created, ${updated} updated.`));
  }

  private getTemplates(templateName?: string): DocTemplate[] {
    if (templateName === 'minimal') {
      return DEFAULT_TEMPLATES.filter(t => ['README.md', 'AGENTS.md'].includes(t.filename));
    }
    return DEFAULT_TEMPLATES;
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Run in dry-run mode without writing files',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '-f, --force',
    description: 'Overwrite existing files',
  })
  parseForce(): boolean {
    return true;
  }

  @Option({
    flags: '-t, --template <type>',
    description: 'Template type to use (default, minimal)',
  })
  parseTemplate(val: string): string {
    return val;
  }

  @Option({
    flags: '-f, --format [string]',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }
}
