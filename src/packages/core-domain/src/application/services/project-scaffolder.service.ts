import { IFileSystem } from '../../domain/interfaces';
import { IPlatformProviders } from '../ports/platform-detection.port';
import { InitProjectInput } from './index';

/**
 * The commit types GIT-08 itself enumerates, in its own `pattern`. Kept in the
 * same order so the two documents can be diffed by eye.
 */
const CONVENTIONAL_COMMIT_TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'];

/** Pinned alongside the config, because GIT-08 asserts the tool is installable. */
const COMMITLINT_DEPENDENCIES: Readonly<Record<string, string>> = Object.freeze({
  '@commitlint/cli': '^19.0.0',
  '@commitlint/config-conventional': '^19.0.0',
});

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

  /**
   * Scaffold the Conventional Commits enforcement GIT-08 requires.
   *
   * GIT-08 is `blocking` and `MUST`, and it binds from the first commit — unlike
   * the artifacts of a later lifecycle phase, there is nothing to decide and
   * nothing to invent here: the corpus already states the convention and its type
   * list, so the scaffold can write it verbatim. Before this, `evolith init`
   * produced a repository that mandated Conventional Commits and enforced them
   * with nothing, and its own first `evolith validate` said so.
   *
   * Three things are written, because GIT-08's handler checks all three legs and
   * the middle one is the failure GT-623 found:
   *
   *  1. `commitlint.config.mjs` — the configuration;
   *  2. the commitlint packages in `devDependencies` — a config whose tool is
   *     never installed cannot run, and a `commit-msg` hook that shrugs and exits
   *     zero when it is missing is worse than no hook at all;
   *  3. `.husky/commit-msg` — the thing that actually runs it, when the caller
   *     asked for hooks. `npx --no-install` is deliberate: if commitlint is not
   *     installed the hook FAILS, it does not skip.
   *
   * Runtime-independent on purpose. commitlint is a Node tool, so a .NET or
   * Python satellite that adopts it carries a tooling-only `package.json` — which
   * is exactly what such repositories do in practice, and what GIT-08's handler
   * reads. Emitting the config without it would leave the rule failing for the
   * runtimes that are not TypeScript.
   *
   * @returns the artifact paths written, relative to the project directory.
   */
  async scaffoldCommitConventions(input: InitProjectInput, projectDir: string): Promise<string[]> {
    const artifacts: string[] = [];

    const config = `export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // GIT-08 — Conventional Commits: type(scope): description
    'type-enum': [2, 'always', ${JSON.stringify(CONVENTIONAL_COMMIT_TYPES)}],
  },
};
`;
    await this.fs.writeFile(`${projectDir}/commitlint.config.mjs`, config);
    artifacts.push('commitlint.config.mjs');

    const packageJsonPath = `${projectDir}/package.json`;
    const packageJson = await this.fs.exists(packageJsonPath)
      ? await this.fs.readJson<Record<string, unknown>>(packageJsonPath)
      : { name: input.name, version: '0.1.0', private: true };

    packageJson.devDependencies = {
      ...(packageJson.devDependencies as Record<string, string> | undefined),
      ...COMMITLINT_DEPENDENCIES,
    };
    await this.fs.writeJson(packageJsonPath, packageJson);
    artifacts.push('package.json');

    if (input.features.includes('hooks')) {
      await this.fs.ensureDir(`${projectDir}/.husky`);
      await this.fs.writeFile(
        `${projectDir}/.husky/commit-msg`,
        '#!/bin/sh\n'
        + '# GIT-08 — reject non-conforming commit messages. `--no-install` makes a\n'
        + '# missing commitlint an ERROR rather than a silent skip (GT-623).\n'
        + 'npx --no-install commitlint --edit "$1"\n',
      );
      artifacts.push('.husky/commit-msg');
    }

    return artifacts;
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
