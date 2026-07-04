import { IFileSystem } from '../../domain/interfaces';
import { RepoDetectionResult } from '../ports/repo-detection.port';

export type FileAction = 'created' | 'skipped' | 'merged' | 'conflict';

export interface ScaffoldResult {
  action: FileAction;
  path: string;
}

export interface AdoptRepoInput {
  name: string;
  monorepo: string;
  features: string[];
  agents: string[];
  hooks: boolean;
  detection: RepoDetectionResult;
}

export class SatelliteScaffolderService {
  constructor(private readonly fs: IFileSystem) {}

  async scaffoldEvolithYaml(input: AdoptRepoInput, cwd: string): Promise<ScaffoldResult> {
    const yamlPath = `${cwd}/evolith.yaml`;
    const exists = await this.fileExists(yamlPath);

    const manifest = this.buildManifest(input);

    if (!exists) {
      await this.fs.writeJson(yamlPath, manifest);
      return { action: 'created', path: 'evolith.yaml' };
    }

    const existing = await this.fs.readJson<Record<string, unknown>>(yamlPath);
    const merged = this.deepMerge(existing, manifest);
    await this.fs.writeJson(yamlPath, merged);
    return { action: 'merged', path: 'evolith.yaml' };
  }

  async scaffoldReadme(input: AdoptRepoInput, cwd: string): Promise<ScaffoldResult> {
    const readmePath = `${cwd}/README.md`;
    const exists = await this.fileExists(readmePath);

    if (!exists) {
      await this.fs.writeFile(readmePath, this.buildReadmeEn(input));
      await this.fs.writeFile(`${cwd}/README.es.md`, this.buildReadmeEs(input));
      return { action: 'created', path: 'README.md' };
    }

    const content = await this.fs.readFile(readmePath);
    if (content.includes('## Evolith Governance')) {
      return { action: 'skipped', path: 'README.md' };
    }

    const governanceSection = this.buildGovernanceSection(input);
    await this.fs.writeFile(readmePath, content + '\n' + governanceSection);
    return { action: 'merged', path: 'README.md' };
  }

  async scaffoldAgentsMd(input: AdoptRepoInput, cwd: string): Promise<ScaffoldResult> {
    const agentsPath = `${cwd}/AGENTS.md`;
    const exists = await this.fileExists(agentsPath);

    if (!exists) {
      await this.fs.writeFile(agentsPath, this.buildAgentsMd(input));
      return { action: 'created', path: 'AGENTS.md' };
    }

    const content = await this.fs.readFile(agentsPath);
    if (content.includes('## Evolith Satellite')) {
      return { action: 'skipped', path: 'AGENTS.md' };
    }

    const satelliteSection = this.buildAgentsMdSection(input);
    await this.fs.writeFile(agentsPath, content + '\n' + satelliteSection);
    return { action: 'merged', path: 'AGENTS.md' };
  }

  async scaffoldGovernanceStructure(cwd: string): Promise<string[]> {
    const dirs = [
      '.harness/rules',
      '.harness/playbooks',
      '.harness/schemas',
      'rulesets',
      'reference/governance/standards/vision',
      'reference/architecture/adrs',
    ];
    const created: string[] = [];
    for (const dir of dirs) {
      const full = `${cwd}/${dir}`;
      if (!(await this.dirExists(full))) {
        await this.fs.ensureDir(full);
        await this.fs.writeFile(`${full}/.gitkeep`, '');
        created.push(dir);
      }
    }
    return created;
  }

  async scaffoldGapTracking(cwd: string): Promise<ScaffoldResult[]> {
    const results: ScaffoldResult[] = [];

    const trackingPath = `${cwd}/reference/governance/standards/vision/gap-tracking.md`;
    if (!(await this.fileExists(trackingPath))) {
      await this.fs.writeFile(trackingPath, this.buildGapTracking());
      results.push({ action: 'created', path: 'reference/governance/standards/vision/gap-tracking.md' });
    } else {
      results.push({ action: 'skipped', path: 'reference/governance/standards/vision/gap-tracking.md' });
    }

    const catalogPath = `${cwd}/reference/governance/standards/vision/gap-reference-catalog.md`;
    if (!(await this.fileExists(catalogPath))) {
      await this.fs.writeFile(catalogPath, this.buildGapReferenceCatalog());
      results.push({ action: 'created', path: 'reference/governance/standards/vision/gap-reference-catalog.md' });
    } else {
      results.push({ action: 'skipped', path: 'reference/governance/standards/vision/gap-reference-catalog.md' });
    }

    const evidencePath = `${cwd}/reference/governance/standards/vision/gap-closure-evidence.json`;
    if (!(await this.fileExists(evidencePath))) {
      await this.fs.writeJson(evidencePath, { version: '1.0.0', entries: [] });
      results.push({ action: 'created', path: 'reference/governance/standards/vision/gap-closure-evidence.json' });
    } else {
      results.push({ action: 'skipped', path: 'reference/governance/standards/vision/gap-closure-evidence.json' });
    }

    return results;
  }

  async scaffoldMaturityAssessment(cwd: string): Promise<ScaffoldResult[]> {
    const results: ScaffoldResult[] = [];

    const assessmentPath = `${cwd}/reference/governance/standards/vision/maturity-assessment.md`;
    if (!(await this.fileExists(assessmentPath))) {
      await this.fs.writeFile(assessmentPath, this.buildMaturityAssessment());
      results.push({ action: 'created', path: 'reference/governance/standards/vision/maturity-assessment.md' });
    } else {
      results.push({ action: 'skipped', path: 'reference/governance/standards/vision/maturity-assessment.md' });
    }

    const evidencePath = `${cwd}/reference/governance/standards/vision/maturity-evidence.json`;
    if (!(await this.fileExists(evidencePath))) {
      await this.fs.writeJson(evidencePath, { version: '1.0.0', assessments: [] });
      results.push({ action: 'created', path: 'reference/governance/standards/vision/maturity-evidence.json' });
    } else {
      results.push({ action: 'skipped', path: 'reference/governance/standards/vision/maturity-evidence.json' });
    }

    return results;
  }

  async scaffoldAdrMatrix(cwd: string): Promise<ScaffoldResult> {
    const path = `${cwd}/reference/architecture/adrs/adr-matrix.json`;
    if (!(await this.fileExists(path))) {
      await this.fs.ensureDir(`${cwd}/reference/architecture/adrs`);
      await this.fs.writeJson(path, { version: '1.0.0', adrs: [] });
      return { action: 'created', path: 'reference/architecture/adrs/adr-matrix.json' };
    }
    return { action: 'skipped', path: 'reference/architecture/adrs/adr-matrix.json' };
  }

  async scaffoldHooks(input: AdoptRepoInput, cwd: string): Promise<ScaffoldResult[]> {
    const results: ScaffoldResult[] = [];

    if (!input.hooks) return results;

    const huskyDir = `${cwd}/.husky`;
    await this.fs.ensureDir(huskyDir);

    const preCommitPath = `${huskyDir}/pre-commit`;
    if (await this.fileExists(preCommitPath)) {
      const content = await this.fs.readFile(preCommitPath);
      if (content.includes('evolution validate')) {
        await this.fs.writeFile(preCommitPath, content.replace(/evolution validate/g, 'evolith validate'));
        results.push({ action: 'merged', path: '.husky/pre-commit' });
      } else {
        results.push({ action: 'skipped', path: '.husky/pre-commit' });
      }
    } else {
      await this.fs.writeFile(preCommitPath, '#!/bin/sh\nevolith validate --pre-commit\n');
      results.push({ action: 'created', path: '.husky/pre-commit' });
    }

    const prePushPath = `${huskyDir}/pre-push`;
    if (!(await this.fileExists(prePushPath))) {
      await this.fs.writeFile(prePushPath, '#!/bin/sh\nevolith validate --pre-push\n');
      results.push({ action: 'created', path: '.husky/pre-push' });
    } else {
      results.push({ action: 'skipped', path: '.husky/pre-push' });
    }

    return results;
  }

  private buildManifest(input: AdoptRepoInput): Record<string, unknown> {
    return {
      coreRef: { version: '1.0.0', path: '../evolith' },
      type: 'satellite',
      satellite: {
        name: input.name,
        adoptedAt: new Date().toISOString(),
        detection: {
          runtime: input.detection.runtime,
          packageManager: input.detection.packageManager,
          framework: input.detection.framework,
          ciPlatform: input.detection.ciPlatform,
        },
      },
      governance: {
        version: '1.0.0',
        inheritedFrom: 'evolith-core',
      },
      monorepo: input.monorepo,
      features: input.features,
      agents: input.agents,
      topology: 'modular-monolith',
      phase: 'discovery',
    };
  }

  private buildReadmeEn(input: AdoptRepoInput): string {
    return `# ${input.name}

> Bilingual navigation: [Español](./README.es.md)

## Evolith Governance

This repository has been adopted as an **Evolith satellite**, inheriting governance standards from Evolith Core.

| Component | Value |
|-----------|-------|
| Type | Satellite |
| Monorepo | ${input.monorepo} |
| Features | ${input.features.join(', ') || 'none'} |
| Agents | ${input.agents.join(', ') || 'none'} |

## Quick Start

\`\`\`bash
evolith validate
evolith sdlc status
\`\`\`
`;
  }

  private buildReadmeEs(input: AdoptRepoInput): string {
    return `# ${input.name}

> Navegación bilingüe: [English](./README.md)

## Gobernanza Evolith

Este repositorio ha sido adoptado como **satélite de Evolith**, heredando estándares de gobernanza de Evolith Core.

| Componente | Valor |
|------------|-------|
| Tipo | Satélite |
| Monorepo | ${input.monorepo} |
| Características | ${input.features.join(', ') || 'ninguna'} |
| Agentes | ${input.agents.join(', ') || 'ninguno'} |

## Inicio Rápido

\`\`\`bash
evolith validate
evolith sdlc status
\`\`\`
`;
  }

  private buildGovernanceSection(input: AdoptRepoInput): string {
    return `
## Evolith Governance

This repository follows Evolith governance standards as a satellite.

| Component | Value |
|-----------|-------|
| Type | Satellite |
| Monorepo | ${input.monorepo} |
| Features | ${input.features.join(', ') || 'none'} |

### Useful Commands

\`\`\`bash
evolith validate
evolith sdlc status
evolith sdlc gate-status
\`\`\`
`;
  }

  private buildAgentsMd(input: AdoptRepoInput): string {
    return `## Project

${input.name} — Evolith satellite repository.

## Evolith Satellite

This repository inherits governance standards from Evolith Core.

- **Type:** Satellite
- **Monorepo:** ${input.monorepo}
- **Features:** ${input.features.join(', ') || 'none'}
- **Agents:** ${input.agents.join(', ') || 'none'}

## Validation

\`\`\`bash
evolith validate
\`\`\`

## Conventions

- Follow Evolith governance standards.
- Maintain bilingual parity (EN/ES) for documentation.
- Use relative repository links for internal Markdown references.
`;
  }

  private buildAgentsMdSection(input: AdoptRepoInput): string {
    return `
## Evolith Satellite

This repository inherits governance standards from Evolith Core.

- **Type:** Satellite
- **Monorepo:** ${input.monorepo}
- **Features:** ${input.features.join(', ') || 'none'}
- **Agents:** ${input.agents.join(', ') || 'none'}

## Validation

\`\`\`bash
evolith validate
\`\`\`
`;
  }

  private buildGapTracking(): string {
    return `# Gap Tracking Board

> Satellite gap tracking for this repository.

## Status Legend

| Status | Description |
|--------|-------------|
| OPEN | Identified gap, not yet addressed |
| IN_PROGRESS | Being worked on |
| DONE | Gap closed with evidence |
| WONTFIX | Accepted, not addressing |

## Gaps

| ID | Description | Status | Priority | Created |
|----|-------------|--------|----------|---------|
| (no gaps yet) | | | | |
`;
  }

  private buildGapReferenceCatalog(): string {
    return `# Gap Reference Catalog

> Reference catalog of gap types for this satellite.

## Gap Categories

| Category | Description |
|----------|-------------|
| governance | Governance and compliance gaps |
| documentation | Documentation completeness gaps |
| testing | Test coverage and quality gaps |
| architecture | Architecture and design gaps |
| operations | Operational readiness gaps |
`;
  }

  private buildMaturityAssessment(): string {
    return `# Maturity Assessment

> Satellite maturity assessment for this repository.

## Assessment Dimensions

| Dimension | Level | Evidence |
|-----------|-------|----------|
| Governance | Initial | Adopted via evolith init |
| Documentation | Initial | Basic structure created |
| Testing | Unknown | Pending assessment |
| Architecture | Unknown | Pending assessment |
| Operations | Unknown | Pending assessment |

## Next Steps

1. Run \`evolith validate\` to assess current state
2. Review gap tracking board for improvement areas
3. Progress through SDLC phases as maturity increases
`;
  }

  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (
        key in result &&
        typeof result[key] === 'object' &&
        result[key] !== null &&
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(result[key]) &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(
          result[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>,
        );
      } else if (!(key in result)) {
        result[key] = source[key];
      }
    }
    return result;
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      const stat = await this.fs.stat(path);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  private async dirExists(path: string): Promise<boolean> {
    try {
      const stat = await this.fs.stat(path);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}
