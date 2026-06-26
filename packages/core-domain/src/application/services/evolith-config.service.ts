/**
 * GT-312: Evolith Config Service
 * Loads and validates evolith.config.json for project-level configuration.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { ValidationContext } from '../validators/modes/validation-mode.interface';

export interface EvolithConfig {
  topology?: string;
  phase?: string;
  rulesets?: string[];
  adrRules?: string[];
  engine?: 'native' | 'opa';
  validation?: {
    modes?: string[];
    parallel?: boolean;
    timeout?: number;
  };
}

export class EvolithConfigService {
  private config: EvolithConfig | null = null;
  private configPath: string | null = null;

  async loadConfig(projectPath: string): Promise<EvolithConfig> {
    const possiblePaths = [
      path.join(projectPath, 'evolith.config.json'),
      path.join(projectPath, '.evolith', 'config.json'),
      path.join(projectPath, 'evolith.yaml'),
      path.join(projectPath, 'reference', 'config', 'evolith.config.json'),
    ];

    for (const configPath of possiblePaths) {
      try {
        const content = await fs.readFile(configPath, 'utf-8');
        this.configPath = configPath;

        if (configPath.endsWith('.json')) {
          this.config = JSON.parse(content);
        } else if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
          const yaml = await import('yaml');
          this.config = yaml.parse(content);
        }

        return this.config!;
      } catch {
        continue;
      }
    }

    this.config = {};
    return this.config;
  }

  async resolveValidationContext(
    projectPath: string,
    corePath?: string,
    cliOptions?: Record<string, unknown>,
  ): Promise<ValidationContext> {
    const config = await this.loadConfig(projectPath);

    return {
      satellitePath: projectPath,
      corePath: corePath || config.topology ? path.join(projectPath, '..', 'evolith_arch32') : undefined,
      engine: (cliOptions?.engine as 'native' | 'opa') || config.engine || 'native',
      topology: (cliOptions?.topology as string) || config.topology,
      phase: (cliOptions?.phase as string) || config.phase,
      rulesetId: (cliOptions?.ruleset as string) || config.rulesets?.[0],
      adrId: (cliOptions?.adr as string) || config.adrRules?.[0],
      filePath: cliOptions?.file as string,
    };
  }

  getConfig(): EvolithConfig | null {
    return this.config;
  }

  getConfigPath(): string | null {
    return this.configPath;
  }

  async validateConfig(config: EvolithConfig): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (config.topology) {
      const validTopologies = [
        'modular-monolith', 'distributed-modules', 'microservices',
        'serverless', 'edge-computing', 'event-driven', 'data-mesh', 'agentic-ai',
      ];
      if (!validTopologies.includes(config.topology)) {
        errors.push(`Invalid topology: ${config.topology}. Valid: ${validTopologies.join(', ')}`);
      }
    }

    if (config.phase) {
      const validPhases = ['f1', 'f2', 'f3', 'f4', 'f5'];
      if (!validPhases.includes(config.phase)) {
        errors.push(`Invalid phase: ${config.phase}. Valid: ${validPhases.join(', ')}`);
      }
    }

    if (config.engine) {
      const validEngines = ['native', 'opa'];
      if (!validEngines.includes(config.engine)) {
        errors.push(`Invalid engine: ${config.engine}. Valid: ${validEngines.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
