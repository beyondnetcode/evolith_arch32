import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import {
  ICatalogLoader,
  Runtime,
  MonorepoOption,
  ArchitecturePattern,
  ToolCatalog,
  CommandsMatrix,
  PhaseDefinition,
} from '../../domain/interfaces';
import { CatalogLoadError } from '../../domain/errors';

interface RuntimeCatalog {
  _comment?: string;
  catalogVersion: string;
  lastUpdated: string;
  runtimes: Runtime[];
  monorepoOptions: MonorepoOption[];
  architecturePatterns: ArchitecturePattern[];
  databaseDefaults: Record<string, string>;
  apiProtocols: Array<{ id: string; name: string; description: string }>;
}

interface ToolCatalogJson {
  _comment?: string;
  catalogVersion: string;
  lastUpdated: string;
  phases: Record<string, PhaseDefinition>;
  toolMetadata: Record<string, { description: string; runtimeAgnostic: boolean; phase: string }>;
}

interface CommandsMatrixJson {
  _comment?: string;
  catalogVersion: string;
  supported: SupportedCommands;
  delegated: DelegatedCommands;
  unsupported: string[];
  platformDetection: Record<string, string>;
}

interface SupportedCommands {
  npm: string[];
  dotnet: string[];
  python: string[];
  pip: string[];
  eslint: string[];
  prettier: string[];
  jest: string[];
  tsc: string[];
}

interface DelegatedCommands {
  nx: string[];
  docker: string[];
  kubectl: string[];
  helm: string[];
  vault: string[];
  rush: string[];
}

@Injectable()
export class CatalogLoader implements ICatalogLoader {
  private runtimeCatalog: RuntimeCatalog | null = null;
  private toolCatalog: ToolCatalogJson | null = null;
  private commandsMatrix: CommandsMatrixJson | null = null;

  private getConfigPath(filename: string): string {
    return path.join(__dirname, '../../config', filename);
  }

  loadRuntimeCatalog(): Runtime[] {
    if (!this.runtimeCatalog) {
      this.runtimeCatalog = this.loadJson<RuntimeCatalog>('runtimes.json');
    }
    return this.runtimeCatalog.runtimes;
  }

  loadToolCatalog(): ToolCatalog {
    if (!this.toolCatalog) {
      this.toolCatalog = this.loadJson<ToolCatalogJson>('tool-catalog.json');
    }
    return {
      phases: this.toolCatalog.phases,
      toolMetadata: this.toolCatalog.toolMetadata as Record<string, { description: string; runtimeAgnostic: boolean; phase: string }>,
    };
  }

  loadCommandsMatrix(): CommandsMatrix {
    if (!this.commandsMatrix) {
      this.commandsMatrix = this.loadJson<CommandsMatrixJson>('cli-commands-matrix.json');
    }
    return this.transformToCommandsMatrix(this.commandsMatrix);
  }

  getMonorepoOptions(): MonorepoOption[] {
    if (!this.runtimeCatalog) {
      this.loadRuntimeCatalog();
    }
    return this.runtimeCatalog!.monorepoOptions;
  }

  getArchitecturePatterns(): ArchitecturePattern[] {
    if (!this.runtimeCatalog) {
      this.loadRuntimeCatalog();
    }
    return this.runtimeCatalog!.architecturePatterns;
  }

  getDefaultDatabase(runtimeId: string): string {
    if (!this.runtimeCatalog) {
      this.loadRuntimeCatalog();
    }
    return this.runtimeCatalog!.databaseDefaults[runtimeId] || 'postgresql';
  }

  getApiProtocols(): Array<{ id: string; name: string; description: string }> {
    if (!this.runtimeCatalog) {
      this.loadRuntimeCatalog();
    }
    return this.runtimeCatalog!.apiProtocols;
  }

  private loadJson<T>(filename: string): T {
    try {
      const filePath = this.getConfigPath(filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new CatalogLoadError(filename, err.message || 'Unknown error');
    }
  }

  private transformToCommandsMatrix(matrix: CommandsMatrixJson): CommandsMatrix {
    return {
      runtimes: {
        npm: { native: matrix.supported.npm, scaffold: [], delegated: [], unsupported: [] },
        dotnet: { native: matrix.supported.dotnet, scaffold: [], delegated: [], unsupported: [] },
        python: { native: matrix.supported.python, scaffold: [], delegated: [], unsupported: [] },
      },
      monorepos: {
        npm: { native: matrix.supported.npm, delegated: [] },
        nx: { native: [], delegated: matrix.delegated.nx },
        rush: { native: [], delegated: matrix.delegated.rush },
      },
      container: {
        delegated: matrix.delegated.docker,
        unsupported: [],
      },
      observability: {
        scaffold: [],
        delegated: [],
      },
    };
  }

  reload(): void {
    this.runtimeCatalog = null;
    this.toolCatalog = null;
    this.commandsMatrix = null;
  }
}