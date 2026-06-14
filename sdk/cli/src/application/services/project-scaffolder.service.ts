import { IFileSystem } from '../../domain/interfaces';
import { IPlatformProviders } from '../ports/platform-detection.port';
import { InitProjectInput } from './index';

export class ProjectScaffolderService {
  private readonly fs: IFileSystem;

  constructor(fs: IFileSystem, private readonly platformProviders?: IPlatformProviders) {
    this.fs = fs;
  }

  async scaffoldEvolithYaml(input: InitProjectInput, projectDir: string): Promise<void> {
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

  async scaffoldReadme(input: InitProjectInput, projectDir: string): Promise<void> {
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

  async scaffoldByRuntime(input: InitProjectInput, projectDir: string): Promise<void> {
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
        await this.scaffoldGeneric(input, projectDir);
        break;
    }
  }

  private async scaffoldGeneric(input: InitProjectInput, projectDir: string): Promise<void> {
    await this.fs.ensureDir(`${projectDir}/src`);
    await this.fs.writeFile(`${projectDir}/src/.gitkeep`, '');
    const setupMd = `# ${input.name} — Setup

Runtime \`${input.runtime}\` does not have a full Evolith scaffold template yet.

## Next steps

1. Add your entry-point files inside \`src/\`
2. Run \`evolith validate\` once your project structure is in place
3. Open a PR to contribute a \`scaffold${input.runtime.charAt(0).toUpperCase()}${input.runtime.slice(1)}\` method to Evolith core

## Evolith commands that work today

\`\`\`bash
evolith validate
evolith sdlc gate-status
\`\`\`
`;
    await this.fs.writeFile(`${projectDir}/SETUP.md`, setupMd);
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

  async checkRuntimePlatform(runtime: string): Promise<{ available: boolean; installHint?: string }> {
    switch (runtime) {
      case 'nodejs':
      case 'typescript':
        return { available: this.platformProviders ? await this.platformProviders.npm.isAvailable() : true };
      case 'dotnet':
        return { available: this.platformProviders ? await this.platformProviders.dotnet.isAvailable() : true };
      case 'python':
        return { available: this.platformProviders ? await this.platformProviders.python.isAvailable() : true };
      default:
        return {
          available: false,
          installHint: `Install the ${runtime} runtime and ensure it is on your PATH.`,
        };
    }
  }
}
