import { Injectable } from '@nestjs/common';
import { RulesetValidatorService, ValidationResult } from '../../application/validators/ruleset-validator.service';
import { SatelliteEvaluationPipeline } from '../services/satellite-evaluation-pipeline.service';
import { SatelliteManifest } from '../../domain/satellite-manifest';
import type {
  PipelineExecutionPlan,
  PipelineVerdict,
} from '../../evaluation/ports/evaluation-pipeline.port';
import * as pathModule from 'path';
import * as fsExtra from 'fs-extra';

export interface ValidateSatelliteInput {
  satellitePath: string;
  corePath?: string;
  rulesetId?: string;
  /**
   * GT-659 — canonical ruleset refs to evaluate against, from the reference
   * catalogue's `$id` space. Absent ⇒ the whole corpus, unchanged.
   *
   * Distinct from `rulesetId` above, which resolves fifteen hand-written
   * aliases down a separate path and cannot name a ruleset the catalogue
   * publishes.
   */
  rulesetRefs?: readonly string[];
  engine?: 'native' | 'opa';
  /**
   * Optional manifest to trigger the end-to-end evaluation pipeline.
   * When provided, the use case resolves topology from the manifest,
   * loads GT-280 structured phase/gate data, executes Rego rules,
   * and returns a structured EvaluationVerdict alongside the
   * general validation result.
   */
  manifest?: SatelliteManifest;
  /**
   * GT-614 — which evaluation kinds the caller asked for, so the pipeline can skip
   * the stages nobody requested. Absent ⇒ the whole pipeline runs, exactly as
   * before: an undeclared request means "no kind was declared", not "no kind is
   * wanted". Only meaningful together with `manifest`.
   */
  plan?: PipelineExecutionPlan;
}

export interface ValidateSatelliteOutput {
  result: ValidationResult;
  formattedOutput?: string;
  /**
   * Present only when input.manifest was provided. Carries the GT-569/GT-614
   * `coverage` facts the pipeline produced, so the out-of-scope bucket survives
   * the hop to the orchestrator instead of being flattened away here.
   */
  evaluationVerdict?: PipelineVerdict;
}

@Injectable()
export class ValidateSatelliteUseCase {
  private readonly validator: RulesetValidatorService;
  private pipeline?: SatelliteEvaluationPipeline;

  constructor(validator?: RulesetValidatorService) {
    this.validator = validator || new RulesetValidatorService();
  }

  async execute(input: ValidateSatelliteInput): Promise<ValidateSatelliteOutput> {
    const { satellitePath, corePath, rulesetId, rulesetRefs, engine, manifest, plan } = input;

    // If a manifest was provided, run the end-to-end evaluation pipeline
    if (manifest) {
      // GT-614: the plan travels with the manifest, so the selection made from
      // `ctx.kinds` reaches the pipeline instead of stopping at this boundary.
      return this.executeWithPipeline(manifest, plan);
    }

    // Fall back to the standard validation logic
    let activeValidator = this.validator;
    if (engine && this.validator) {
      activeValidator = new RulesetValidatorService({
        engineType: engine,
        fileSystem: (this.validator as any).fs,
        logger: (this.validator as any).logger,
        configParser: (this.validator as any).configParser,
        rulesetRepo: (this.validator as any).engine?.rulesetRepo,
        // GT-664 — the enforcer subsystem has to survive this rebuild.
        //
        // The CLI always sends an engine (`options.engine === 'opa' ? 'opa' :
        // 'native'`), so this branch runs on EVERY `evolith validate`. It
        // reconstructed the validator from four collaborators and dropped the
        // fifth, and `RulesetValidatorService` only builds the composite
        // enforcer strategy when a `processRunner` is present — so the runner
        // `app.module.ts` injects "GT-519 parity: register the enforcer
        // subsystem on the CLI surface identically to REST/MCP" was created,
        // handed over, and thrown away one call later.
        //
        // Measured, not inferred: `evolith validate --select
        // src/rulesets/standards/iso-5055.rules.json` returned in 1.5s with all
        // four rules skipped, and an instrumented build showed
        // `EnforcerEvaluator.evaluateAll` was never entered — two validators
        // were constructed, one with a runner and one without, and the command
        // used the one without. Every `enforce:` rule in the corpus was
        // affected, not only this pack: the six ADR-0002 dependency-cruiser
        // rules are `blocking: true` and had been silently degrading to the
        // native engine for their whole life on this surface.
        processRunner: (this.validator as any).processRunner,
        metrics: (this.validator as any).metrics,
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
      result = await activeValidator.validate(satellitePath, corePath, rulesetRefs?.length ? { policyRefs: rulesetRefs } : undefined);
    }

    return { result };
  }

  private async executeWithPipeline(
    manifest: SatelliteManifest,
    plan?: PipelineExecutionPlan,
  ): Promise<ValidateSatelliteOutput> {
    const corePath = manifest.corePath || this.findCoreFromSatellite(manifest.satellitePath);
    const validator = this.buildValidator(corePath);
    const pipeline = new SatelliteEvaluationPipeline(
      (validator as any).fs,
      (validator as any).logger,
      validator,
      corePath,
    );

    const verdict = await pipeline.evaluate(manifest, plan);
    const result: ValidationResult = {
      status: verdict.passed ? 'passed' : 'failed',
      rulesChecked: verdict.summary.totalRules,
      issues: [],
      coreRef: { version: null, path: corePath },
      timestamp: verdict.evaluatedAt,
    };

    // Flatten failed artifact evaluations into validation issues
    for (const gate of verdict.gates) {
      for (const evalResult of gate.artifactEvaluations) {
        if (!evalResult.passed) {
          result.issues.push({
            ruleId: evalResult.ruleId,
            severity: 'MUST',
            category: 'sdlc',
            title: `Gate ${gate.gateName}: ${evalResult.artifact}`,
            description: evalResult.message,
            file: evalResult.artifact,
            blocking: true,
          });
        }
      }
    }

    return { result, evaluationVerdict: verdict };
  }

  private buildValidator(corePath: string): RulesetValidatorService {
    const fs = (this.validator as any).fs;
    return new RulesetValidatorService({
      engineType: 'native',
      fileSystem: fs,
      logger: (this.validator as any).logger,
      configParser: (this.validator as any).configParser,
      rulesetRepo: (this.validator as any).engine?.rulesetRepo,
    });
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
    const parts = satellitePath.split(pathModule.sep);
    while (parts.length > 0) {
      parts.pop();
      const candidate = pathModule.join(parts.join(pathModule.sep), 'rulesets');
      try {
        if (fsExtra.pathExistsSync(candidate)) {
          return parts.join(pathModule.sep);
        }
      } catch {
        continue;
      }
    }
    return satellitePath;
  }
}