import { Command, Option } from 'nest-commander';
import { Inject, Injectable } from '@nestjs/common';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { IFileSystem } from '@evolith/core-domain/domain/interfaces';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import * as path from 'path';

interface FixturesCommandOptions {
  dir?: string;
  dryRun?: boolean;
  type?: string;
}

type FixtureType = 'demo' | 'adr' | 'ruleset' | 'evolith' | 'full';

interface FixtureFile {
  relativePath: string;
  content: string;
}

@Injectable()
@Command({
  name: 'fixtures',
  arguments: '[type]',
  description: 'Seed reproducible fixtures and sample data for demos and tests',
})
export class FixturesCommand extends BaseEvolithCommand {
  constructor(
    @Inject('IFileSystem') private readonly fileSystem: IFileSystem,
    promptService: PromptService,
  ) {
    super('FixturesCommand', promptService);
  }

  async executeCommand(
    passedParam: string[],
    options?: FixturesCommandOptions,
  ): Promise<void> {
    const fixtureType = (passedParam?.[0] || options?.type || 'demo') as FixtureType;
    const targetDir = options?.dir || process.cwd();
    const dryRun = !!options?.dryRun;

    if (!['demo', 'adr', 'ruleset', 'evolith', 'full'].includes(fixtureType)) {
      this.promptService.showError(`Invalid fixture type: ${fixtureType}. Valid types: demo, adr, ruleset, evolith, full`);
      return;
    }

    this.promptService.showIntro(`Evolith Fixtures — ${fixtureType}`);

    if (dryRun) {
      this.promptService.showInfo('[DRY RUN] Files will not be written');
    }

    const files = this.generateFixtures(fixtureType);

    this.promptService.showInfo(`Fixture type: ${fixtureType}`);
    this.promptService.showInfo(`Target directory: ${targetDir}`);
    this.promptService.showInfo(`Files to create: ${files.length}`);

    if (dryRun) {
      for (const file of files) {
        this.promptService.showInfo(`  [dry-run] ${file.relativePath}`);
      }
      this.promptService.showOutro('DRY RUN — no files written');
      return;
    }

    this.promptService.startSpinner('Writing fixture files...');

    const created: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const fullPath = path.join(targetDir, file.relativePath);
        await this.fileSystem.ensureDir(path.dirname(fullPath));
        await this.fileSystem.writeFile(fullPath, file.content);
        created.push(file.relativePath);
      } catch (err) {
        errors.push(`${file.relativePath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    this.promptService.stopSpinner();

    if (errors.length === 0) {
      this.promptService.showSuccess(`✓ ${created.length} fixture files created`);
      for (const file of created) {
        this.promptService.showInfo(`  - ${file}`);
      }
    } else {
      this.promptService.showError(`✗ ${errors.length} errors`);
      for (const err of errors) {
        this.promptService.showError(`  - ${err}`);
      }
    }

    this.promptService.showOutro(errors.length === 0 ? 'Fixtures ready' : 'Completed with errors');
  }

  private generateFixtures(type: FixtureType): FixtureFile[] {
    switch (type) {
      case 'evolith':
        return this.generateEvolithFixtures();
      case 'adr':
        return this.generateAdrFixtures();
      case 'ruleset':
        return this.generateRulesetFixtures();
      case 'demo':
        return [...this.generateEvolithFixtures(), ...this.generateAdrFixtures()];
      case 'full':
        return [...this.generateEvolithFixtures(), ...this.generateAdrFixtures(), ...this.generateRulesetFixtures()];
    }
  }

  private generateEvolithFixtures(): FixtureFile[] {
    return [
      {
        relativePath: 'evolith.yaml',
        content: [
          'coreRef:',
          '  version: "1.0.0"',
          '  path: "../evolith"',
          'governance:',
          '  version: "1.0"',
          'product:',
          '  name: "demo-project"',
          '  type: "library"',
          'phases:',
          '  - "phase-0"',
          '  - "phase-1"',
          '  - "phase-2"',
          '',
        ].join('\n'),
      },
    ];
  }

  private generateAdrFixtures(): FixtureFile[] {
    return [
      {
        relativePath: 'docs/adr/0001-record-architecture-decisions.md',
        content: [
          '# ADR-0001: Record Architecture Decisions',
          '',
          '**Status:** Accepted',
          '**Date:** 2026-06-01',
          '',
          '## Context',
          '',
          'We need to record the architectural decisions made on this project.',
          '',
          '## Decision',
          '',
          'We will use Architecture Decision Records (ADRs) as described by Michael Nygard.',
          '',
          '## Consequences',
          '',
          '- ADRs are stored in `docs/adr/`',
          '- Each ADR follows the standard template',
          '',
        ].join('\n'),
      },
      {
        relativePath: 'docs/adr/0002-use-clean-architecture.md',
        content: [
          '# ADR-0002: Use Clean Architecture',
          '',
          '**Status:** Accepted',
          '**Date:** 2026-06-01',
          '',
          '## Context',
          '',
          'The application needs a clear separation of concerns to remain maintainable as it grows.',
          '',
          '## Decision',
          '',
          'We will adopt Clean Architecture with domain, application, infrastructure, and presentation layers.',
          '',
          '## Consequences',
          '',
          '- Domain layer has zero external dependencies',
          '- Use cases encapsulate business rules',
          '- Infrastructure depends on abstractions, not concretions',
          '',
        ].join('\n'),
      },
      {
        relativePath: 'docs/adr/0003-use-nestjs-for-backend.md',
        content: [
          '# ADR-0003: Use NestJS for Backend',
          '',
          '**Status:** Accepted',
          '**Date:** 2026-06-01',
          '',
          '## Context',
          '',
          'The backend requires a structured framework with built-in DI, modularity, and testing support.',
          '',
          '## Decision',
          '',
          'We will use NestJS with TypeScript for the backend services.',
          '',
          '## Consequences',
          '',
          '- Dependency injection is built-in via NestJS DI',
          '- Modules provide clear boundaries',
          '- Testing utilities are available out of the box',
          '',
        ].join('\n'),
      },
    ];
  }

  private generateRulesetFixtures(): FixtureFile[] {
    return [
      {
        relativePath: 'rulesets/architecture.yaml',
        content: [
          'ruleset:',
          '  id: "architecture-conventions"',
          '  version: "1.0"',
          '  rules:',
          '    - id: "F1"',
          '      title: "Domain layer isolation"',
          '      description: "Domain layer must not depend on infrastructure"',
          '      severity: "error"',
          '    - id: "F2"',
          '      title: "Use case naming"',
          '      description: "Use cases must follow <Verb><Noun>UseCase pattern"',
          '      severity: "warning"',
          '',
        ].join('\n'),
      },
      {
        relativePath: 'rulesets/naming.yaml',
        content: [
          'ruleset:',
          '  id: "naming-conventions"',
          '  version: "1.0"',
          '  rules:',
          '    - id: "N1"',
          '      title: "File naming"',
          '      description: "Files must use kebab-case"',
          '      severity: "error"',
          '    - id: "N2"',
          '      title: "Class naming"',
          '      description: "Classes must use PascalCase"',
          '      severity: "error"',
          '',
        ].join('\n'),
      },
    ];
  }

  @Option({
    flags: '-d, --dir <directory>',
    description: 'Target directory for fixtures (default: current directory)',
  })
  parseDir(val: string): string {
    return val;
  }

  @Option({
    flags: '-n, --dry-run',
    description: 'Preview files without writing',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '-t, --type <type>',
    description: 'Fixture type: demo, adr, ruleset, evolith, full',
  })
  parseType(val: string): string {
    return val;
  }
}
