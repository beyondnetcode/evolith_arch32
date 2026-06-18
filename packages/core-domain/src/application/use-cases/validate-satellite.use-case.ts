import { Injectable } from '@nestjs/common';
import { RulesetValidatorService, ValidationResult } from '../../application/validators/ruleset-validator.service';

export interface ValidateSatelliteInput {
  satellitePath: string;
  corePath?: string;
  rulesetId?: string;
  engine?: 'native' | 'opa';
}

export interface ValidateSatelliteOutput {
  result: ValidationResult;
  formattedOutput?: string;
}

@Injectable()
export class ValidateSatelliteUseCase {
  private readonly validator: RulesetValidatorService;

  constructor(validator?: RulesetValidatorService) {
    this.validator = validator || new RulesetValidatorService();
  }

  async execute(input: ValidateSatelliteInput): Promise<ValidateSatelliteOutput> {
    const { satellitePath, corePath, rulesetId, engine } = input;
    
    // If validator wasn't provided, we can re-instantiate it if the engine is custom
    let activeValidator = this.validator;
    if (engine && this.validator) {
      activeValidator = new RulesetValidatorService({
        engineType: engine,
        fileSystem: (this.validator as any).fs,
        logger: (this.validator as any).logger,
        configParser: (this.validator as any).configParser,
        rulesetRepo: (this.validator as any).engine?.rulesetRepo,
      });
    }

    let result: ValidationResult;

    if (rulesetId) {
      const coreResolved = corePath || this.findCoreFromSatellite(satellitePath);
      const issues = await activeValidator.loadRulesetById(coreResolved, rulesetId);
      result = {
        status: issues.some(i => i.blocking) ? 'failed' : issues.length > 0 ? 'warning' : 'passed',
        rulesChecked: issues.length,
        issues,
        coreRef: { version: null, path: coreResolved },
        timestamp: new Date().toISOString(),
      };
    } else {
      result = await activeValidator.validate(satellitePath, corePath);
    }

    return { result };
  }

  async executeWithFormat(
    input: ValidateSatelliteInput,
    format: 'json' | 'markdown',
  ): Promise<ValidateSatelliteOutput> {
    const { result } = await this.execute(input);

    let formattedOutput: string | undefined;
    if (format === 'markdown') {
      formattedOutput = this.formatMarkdown(result);
    }

    return { result, formattedOutput };
  }

  private formatMarkdown(result: ValidationResult): string {
    const lines: string[] = [
      '# Validation Report',
      '',
      `**Status:** ${result.status.toUpperCase()}`,
      `**Rules Checked:** ${result.rulesChecked}`,
      `**Timestamp:** ${result.timestamp}`,
      '',
    ];

    if (result.coreRef.version) {
      lines.push(`**Core Version:** ${result.coreRef.version}`);
    }

    lines.push('');

    const blocking = result.issues.filter(i => i.blocking);
    const warnings = result.issues.filter(i => !i.blocking);

    if (blocking.length > 0) {
      lines.push('## Blocking Issues');
      for (const issue of blocking) {
        lines.push(`- **${issue.ruleId}** [${issue.severity}] ${issue.title}`);
        lines.push(`  - ${issue.description}`);
        if (issue.file) {
          lines.push(`  - File: \`${issue.file}\``);
        }
      }
      lines.push('');
    }

    if (warnings.length > 0) {
      lines.push('## Warnings');
      for (const issue of warnings) {
        lines.push(`- **${issue.ruleId}** [${issue.severity}] ${issue.title}`);
        lines.push(`  - ${issue.description}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private findCoreFromSatellite(satellitePath: string): string {
    const path = require('path');
    const parts = satellitePath.split(path.sep);
    while (parts.length > 0) {
      parts.pop();
      const candidate = path.join(parts.join(path.sep), 'rulesets');
      try {
        const fs = require('fs-extra');
        if (fs.pathExistsSync(candidate)) {
          return parts.join(path.sep);
        }
      } catch {
        continue;
      }
    }
    return satellitePath;
  }
}