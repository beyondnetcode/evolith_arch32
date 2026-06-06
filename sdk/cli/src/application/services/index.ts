import { PhaseService } from '../../domain/services';
import { catalogLoader } from '../../infrastructure/catalog/catalog-loader';
import { npmProvider, dotnetProvider, pythonProvider, nxProvider } from '../../infrastructure/cli/providers';
import { PlatformNotFoundError, ValidationError } from '../../core/errors';
import { logger, Timed, commandWatcher } from '../../core/observability';

export interface InitProjectInput {
  name: string;
  runtime: string;
  monorepo: string;
  architecture: string;
  database: string;
  apiProtocol: string;
  ciCd: string;
  observability: string;
  features: string[];
  agents: string[];
}

export interface InitProjectResult {
  success: boolean;
  artifacts: string[];
  warnings: string[];
  errors: string[];
}

export class InitializeProjectUseCase {
  private readonly fs: any;
  private readonly phaseService: PhaseService;

  constructor(fs: any) {
    this.fs = fs;
    this.phaseService = new PhaseService();
  }

  @Timed('InitializeProjectUseCase.execute')
  async execute(input: InitProjectInput, cwd: string): Promise<InitProjectResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const artifacts: string[] = [];

    try {
      const runtimes = catalogLoader.loadRuntimeCatalog();
      const runtime = runtimes.find(r => r.id === input.runtime);
      if (!runtime) {
        errors.push(`Runtime ${input.runtime} not found`);
        return { success: false, artifacts, warnings, errors };
      }

      const monorepos = catalogLoader.getMonorepoOptions();
      const monorepo = monorepos.find(m => m.id === input.monorepo);
      if (!monorepo) {
        errors.push(`Monorepo ${input.monorepo} not found`);
        return { success: false, artifacts, warnings, errors };
      }

      const architectures = catalogLoader.getArchitecturePatterns();
      const architecture = architectures.find(a => a.id === input.architecture);
      if (!architecture) {
        errors.push(`Architecture ${input.architecture} not found`);
        return { success: false, artifacts, warnings, errors };
      }

      const projectDir = `${cwd}/${input.name}`;
      await this.fs.ensureDir(projectDir);

      await this.scaffoldEvolithYaml(input, projectDir);
      artifacts.push(`${input.name}/evolith.yaml`);

      await this.scaffoldReadme(input, projectDir);
      artifacts.push(`${input.name}/README.md`, `${input.name}/README.es.md`);

      await this.scaffoldByRuntime(input, projectDir);
      artifacts.push(`${input.name}/package.json`);

      if (input.features.includes('adr')) {
        await this.fs.ensureDir(`${projectDir}/reference/architecture/adrs`);
        await this.fs.writeJson(`${projectDir}/reference/architecture/adrs/adr-matrix.json`, { adrs: [] });
        artifacts.push(`${input.name}/reference/architecture/adrs/adr-matrix.json`);
      }

      if (input.features.includes('hooks')) {
        await this.fs.ensureDir(`${projectDir}/.husky`);
        await this.fs.writeFile(`${projectDir}/.husky/pre-commit`, '#!/bin/sh\nevolution validate --pre-commit\n');
        artifacts.push(`${input.name}/.husky/pre-commit`);
      }

      if (input.features.includes('acl')) {
        await this.fs.ensureDir(`${projectDir}/rulesets/acl`);
        await this.fs.writeJson(`${projectDir}/rulesets/acl/anti-corruption-layer.rules.json`, { version: '1.0.0', principles: [] });
        artifacts.push(`${input.name}/rulesets/acl/anti-corruption-layer.rules.json`);
      }

      const platformCheck = await this.checkRuntimePlatform(input.runtime);
      if (!platformCheck.available) {
        warnings.push(`Platform ${input.runtime} not detected. ${platformCheck.installHint || ''}`);
      }

      return { success: true, artifacts, warnings, errors };
    } catch (error: unknown) {
      const err = error as { message?: string };
      errors.push(err.message || 'Unknown error');
      return { success: false, artifacts, warnings, errors };
    }
  }

  private async scaffoldEvolithYaml(input: InitProjectInput, projectDir: string): Promise<void> {
    const config = {
      coreRef: { version: '1.0.0', path: '../evolith' },
      governance: { version: '1.0.0' },
      product: { name: input.name, type: 'enterprise-application', phase: 'phase-0' },
      tools: {
        runtime: input.runtime,
        monorepo: input.monorepo,
        architecture: input.architecture,
        database: input.database,
        api: input.apiProtocol,
        ci: input.ciCd,
        observability: input.observability,
      },
    };
    await this.fs.writeJson(`${projectDir}/evolith.yaml`, config);
  }

  private async scaffoldReadme(input: InitProjectInput, projectDir: string): Promise<void> {
    const readmeEn = `# ${input.name}

> Bilingual navigation: [Español](./README.es.md)

## Overview

This repository follows Evolith governance standards.

## Configuration

| Component | Tool |
|-----------|------|
| Runtime | ${input.runtime} |
| Monorepo | ${input.monorepo} |
| Architecture | ${input.architecture} |
| Database | ${input.database} |
| API | ${input.apiProtocol} |

## Quick Start

\`\`\`bash
evolith validate
evolith sdlc status
\`\`\`
`;

    const readmeEs = `# ${input.name}

> Navegación bilingüe: [English](./README.md)

## Descripción General

Este repositorio sigue los estándares de gobernanza de Evolith.

## Configuración

| Componente | Herramienta |
|------------|-------------|
| Runtime | ${input.runtime} |
| Monorepo | ${input.monorepo} |
| Arquitectura | ${input.architecture} |
| Base de Datos | ${input.database} |
| API | ${input.apiProtocol} |

## Inicio Rápido

\`\`\`bash
evolith validate
evolith sdlc status
\`\`\`
`;

    await this.fs.writeFile(`${projectDir}/README.md`, readmeEn);
    await this.fs.writeFile(`${projectDir}/README.es.md`, readmeEs);
  }

  private async scaffoldByRuntime(input: InitProjectInput, projectDir: string): Promise<void> {
    switch (input.runtime) {
      case 'nodejs':
      case 'typescript':
        await this.scaffoldNodeJs(input, projectDir);
        break;
      case 'dotnet':
        await this.scaffoldDotnet(input, projectDir);
        break;
      case 'python':
        await this.scaffoldPython(input, projectDir);
        break;
      default:
        throw new Error(`Runtime ${input.runtime} scaffolding not implemented`);
    }
  }

  private async scaffoldNodeJs(input: InitProjectInput, projectDir: string): Promise<void> {
    const isTs = input.runtime === 'typescript';

    const packageJson: Record<string, unknown> = {
      name: input.name,
      version: '0.1.0',
      scripts: {
        build: isTs ? 'tsc' : 'echo "No build"',
        start: isTs ? 'node dist/main.js' : 'node src/index.js',
        dev: isTs ? 'ts-node src/main.ts' : 'node src/index.js',
        test: 'jest',
        lint: 'eslint .',
        validate: 'evolith validate',
      },
      devDependencies: isTs
        ? { typescript: '^5.0.0', '@types/node': '^20.0.0', jest: '^29.0.0', eslint: '^8.0.0' }
        : { jest: '^29.0.0', eslint: '^8.0.0' },
    };

    await this.fs.writeJson(`${projectDir}/package.json`, packageJson);
    await this.fs.ensureDir(`${projectDir}/src`);

    if (isTs) {
      await this.fs.writeJson(`${projectDir}/tsconfig.json`, {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist'],
      });
    }
  }

  private async scaffoldDotnet(input: InitProjectInput, projectDir: string): Promise<void> {
    const csproj = `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <OutputType>Exe</OutputType>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
`;
    await this.fs.writeFile(`${projectDir}/${input.name}.csproj`, csproj);
    await this.fs.ensureDir(`${projectDir}/src`);
  }

  private async scaffoldPython(input: InitProjectInput, projectDir: string): Promise<void> {
    await this.fs.writeFile(`${projectDir}/requirements.txt`, `# ${input.name}\npytest>=8.0.0\nblack>=24.0.0\nruff>=0.2.0\n`);
    await this.fs.writeJson(`${projectDir}/pyproject.toml`, {
      project: { name: input.name, version: '0.1.0', requiresPython: '>=3.11' },
      tool: { black: { lineLength: 100 }, ruff: { lineLength: 100 } },
    });
    await this.fs.ensureDir(`${projectDir}/src`);
    await this.fs.writeFile(`${projectDir}/src/__init__.py`, '');
    await this.fs.writeFile(`${projectDir}/src/main.py`, `def main():\n    print("${input.name} initialized")\n\nif __name__ == "__main__":\n    main()\n`);
  }

  private async checkRuntimePlatform(runtime: string): Promise<{ available: boolean; installHint?: string }> {
    switch (runtime) {
      case 'nodejs':
      case 'typescript':
        return { available: await npmProvider.isAvailable() };
      case 'dotnet':
        return { available: await dotnetProvider.isAvailable() };
      case 'python':
        return { available: await pythonProvider.isAvailable() };
      default:
        return { available: false };
    }
  }
}

export class PhaseTransitionUseCase {
  private readonly fs: any;
  private readonly phaseService: PhaseService;

  constructor(fs: any) {
    this.fs = fs;
    this.phaseService = new PhaseService();
  }

  @Timed('PhaseTransitionUseCase.execute')
  async execute(from: string, to: string, tools: string[], cwd: string): Promise<PhaseTransitionResult> {
    logger.info('Phase transition initiated', { from, to, toolCount: tools.length });

    const warnings: string[] = [];
    const errors: string[] = [];

    if (!this.phaseService.canTransition(from, to)) {
      errors.push(`Invalid phase transition: ${from} → ${to}. Must be consecutive phases.`);
      return { success: false, from, to, gateResults: [], executedTools: [], warnings, errors };
    }

    const gateResults = await this.validateGates(from, cwd);
    const failedRequiredGates = gateResults.filter(g => !g.passed && g.required);

    if (failedRequiredGates.length > 0) {
      errors.push(...failedRequiredGates.map(g => `Gate ${g.id} failed: ${g.description}`));
    }

    const executedTools: string[] = [];
    for (const tool of tools) {
      executedTools.push(tool);
    }

    return {
      success: errors.length === 0,
      from,
      to,
      gateResults,
      executedTools,
      warnings,
      errors,
    };
  }

  private async validateGates(phase: string, cwd: string): Promise<GateResult[]> {
    const gates: GateResult[] = [];
    const evolithYamlPath = `${cwd}/evolith.yaml`;

    switch (phase) {
      case 'phase-0':
        gates.push({ id: 'PG0-01', passed: await this.fs.exists(evolithYamlPath), description: 'evolith.yaml exists', required: true });
        if (await this.fs.exists(evolithYamlPath)) {
          const config = await this.fs.readJson(evolithYamlPath) as { coreRef?: { version?: string } };
          gates.push({ id: 'PG0-02', passed: !!config.coreRef?.version, description: 'coreRef.version pinned', required: true });
        }
        break;
      case 'phase-1':
        gates.push({ id: 'PG1-01', passed: await this.fs.exists(`${cwd}/package.json`), description: 'package.json exists', required: true });
        gates.push({ id: 'PG1-02', passed: await this.fs.exists(`${cwd}/src`), description: 'src/ directory exists', required: true });
        break;
      case 'phase-2':
        gates.push({ id: 'PG2-01', passed: await this.fs.exists(`${cwd}/rulesets`), description: 'rulesets/ exists', required: true });
        gates.push({ id: 'PG2-02', passed: await this.fs.exists(`${cwd}/.harness`), description: '.harness/ exists', required: true });
        break;
    }

    return gates;
  }
}

interface GateResult {
  id: string;
  passed: boolean;
  description: string;
  required: boolean;
}

interface PhaseTransitionResult {
  success: boolean;
  from: string;
  to: string;
  gateResults: GateResult[];
  executedTools: string[];
  warnings: string[];
  errors: string[];
}