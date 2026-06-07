import { Command, CommandRunner, Option } from 'nest-commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as p from '@clack/prompts';
import chalk from 'chalk';

interface DocsCommandOptions {
  dryRun?: boolean;
  force?: boolean;
  template?: string;
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
    filename: '.evolith/evolith.yaml',
    description: 'Evolith configuration file',
    content: `coreRef:
  version: "1.0.0"
  path: "../evolith"
governance:
  version: "1.0"
product:
  name: "project-name"
  type: "library"
`,
  },
];

@Command({
  name: 'docs',
  description: 'Scaffolds base documentation required by Evolith',
})
export class DocsCommand extends CommandRunner {
  async run(passedParam: string[], options?: DocsCommandOptions): Promise<void> {
    const dryRun = options?.dryRun || false;
    const force = options?.force || false;

    p.intro(chalk.bgYellow.black.bold(' Evolith SDK - Document Scaffold '));

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
      p.log.info('All documentation files already exist. Use --force to overwrite.');
      p.outro(chalk.yellow('No changes made.'));
      return;
    }

    p.log.info(`Files to create: ${filesToCreate.length}`);
    p.log.info(`Files to update: ${filesToUpdate.length}`);
    p.log.info(`Files skipped: ${filesSkipped.length}`);

    if (dryRun) {
      p.log.info(chalk.cyan('[DRY RUN] No files will be written.'));
      for (const t of [...filesToCreate, ...filesToUpdate]) {
        p.log.message(`  ${chalk.green('+')} ${t.filename} - ${t.description}`);
      }
      p.outro(chalk.green('Dry run completed.'));
      return;
    }

    let created = 0;
    let updated = 0;

    for (const template of filesToCreate) {
      const filePath = path.join(targetDir, template.filename);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, template.content, 'utf-8');
      p.log.success(`Created: ${template.filename}`);
      created++;
    }

    for (const template of filesToUpdate) {
      const filePath = path.join(targetDir, template.filename);
      await fs.writeFile(filePath, template.content, 'utf-8');
      p.log.success(`Updated: ${template.filename}`);
      updated++;
    }

    p.outro(chalk.green(`Documentation scaffolded: ${created} created, ${updated} updated.`));
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
}
