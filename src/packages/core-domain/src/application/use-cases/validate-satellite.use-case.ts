import { Injectable } from '@nestjs/common';
import { rebuildValidatorForEngine } from '../validators/ruleset-validator.rebuild';
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
      return this.executeWithPipeline(manifest, plan, engine);
    }

    // Fall back to the standard validation logic
    let activeValidator = this.validator;
    if (engine && this.validator) {
      // GT-701 — one rebuild, shared. This branch and `buildValidator` below held
      // two hand-copied versions of the same construction; GT-664 was one of them
      // dropping `processRunner` while the other kept it.
      activeValidator = rebuildValidatorForEngine(this.validator, engine);
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
    engine?: 'native' | 'opa',
  ): Promise<ValidateSatelliteOutput> {
    const corePath = manifest.corePath || this.findCoreFromSatellite(manifest.satellitePath);
    const validator = this.buildValidator(corePath, engine);
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

  /**
   * GT-688 — this used to hardcode `'native'` and drop two collaborators, and
   * both losses were invisible from the standard path that documents them.
   *
   * `execute` returns into the pipeline BEFORE it reads `engine`, so
   * `evolith validate --engine opa` accepted the flag, advertised it in `--help`,
   * and evaluated natively: a verifier driving the product surfaces with a
   * recording OPA sidecar measured ZERO requests. Answering with a different
   * engine than the one asked for is worse than refusing, because the verdict
   * that comes back looks legitimate.
   *
   * The `processRunner`/`metrics` loss is the SAME GT-664 defect the branch above
   * documents at length — it was fixed there and left standing here, so every
   * `enforce:` rule degraded silently on the pipeline path too.
   */
  private buildValidator(corePath: string, engine?: 'native' | 'opa'): RulesetValidatorService {
    return rebuildValidatorForEngine(this.validator, engine ?? 'native');
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