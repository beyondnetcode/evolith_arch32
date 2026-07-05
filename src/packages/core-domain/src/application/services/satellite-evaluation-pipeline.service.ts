import { IFileSystem, ILogger } from '../../domain/interfaces';
import { SatelliteManifest, EvaluationVerdict, PipelineGateResult, RuleEvaluation, EvaluationSeverity, EvaluationFacts } from '../../domain/satellite-manifest';
import { TopologyCatalogService, TopologyManifest } from './topology-catalog.service';
import { SdlcDataLoaderService, StructuredGate } from './sdlc-data-loader.service';
import { RulesetValidatorService } from '../validators/ruleset-validator.service';
import { createSuccessEnvelope } from '../../domain/gate-evidence';
import { toLegacyPhaseId } from '../../domain/sdlc/phase-id';
import { OpaEvaluator } from '../validators/evaluators/opa-evaluator';
import * as path from 'path';

/**
 * End-to-end evaluation pipeline for GT-281.
 *
 * Orchestrates: manifest → topology resolution → phase gate loading →
 * Rego rule execution → structured verdict.
 *
 * Composes existing capabilities rather than rewriting them:
 * - TopologyCatalogService for manifest resolution
 * - SdlcDataLoaderService for GT-280 structured data
 * - OpaEvaluator for Rego execution
 * - RulesetValidatorService for general ruleset validation
 */
export class SatelliteEvaluationPipeline {
  private readonly topologyCatalog: TopologyCatalogService;
  private readonly sdlcDataLoader: SdlcDataLoaderService;
  private readonly opaEvaluator: OpaEvaluator;

  constructor(
    private readonly fs: IFileSystem,
    private readonly logger: ILogger,
    private readonly validator: RulesetValidatorService,
    corePath: string,
  ) {
    this.topologyCatalog = new TopologyCatalogService(fs, logger);
    this.sdlcDataLoader = new SdlcDataLoaderService(fs, logger, corePath);
    this.opaEvaluator = new OpaEvaluator(fs, logger);
  }

  async evaluate(manifest: SatelliteManifest): Promise<EvaluationVerdict> {
    const corePath = manifest.corePath || this.discoverCorePath(manifest.satellitePath);

    // Step 1: Resolve topology
    const topology = manifest.topology || await this.resolveTopology(manifest.satellitePath, corePath);

    // Step 2: Determine which phases to evaluate (GT-343: accept canonical ids,
    // normalize to the legacy f1..f5 the structured gate data is keyed by).
    const phaseIds = manifest.phase
      ? [toLegacyPhaseId(manifest.phase) ?? manifest.phase]
      : ['f1', 'f2', 'f3', 'f4', 'f5'];

    // Step 3: Load gates from GT-280 structured data
    const gateResults: PipelineGateResult[] = [];
    for (const phaseId of phaseIds) {
      const gates = await this.sdlcDataLoader.loadGatesForPhase(phaseId);
      for (const gate of gates) {
        const result = await this.evaluateGate(gate, manifest.satellitePath, corePath, topology, manifest.facts);
        gateResults.push(result);
      }
    }

    // Step 4: Run general ruleset validation (GT-395: enforce canonical rulesets)
    const generalResult = await this.validator.validate(manifest.satellitePath, corePath);

    // GT-395: Convert blocking general-result issues into a synthetic gate so
    // they are visible in the output and participate in the top-level verdict.
    const generalGate = this.buildGeneralRulesetsGate(generalResult);
    if (generalGate) {
      gateResults.push(generalGate);
    }

    // Step 5: Build summary
    const allEvals = gateResults.flatMap(g => g.artifactEvaluations);
    const passedGates = gateResults.filter(g => g.verdict === 'passed');
    const evaluatedAt = new Date().toISOString();

    const summary = {
      totalGates: gateResults.length,
      passedGates: passedGates.length,
      failedGates: gateResults.length - passedGates.length,
      totalRules: allEvals.length + generalResult.rulesChecked,
      passedRules: allEvals.filter(e => e.passed).length,
      failedRules: allEvals.filter(e => !e.passed).length,
    };

    // ADR-0073 output envelope
    const outputEnvelope = createSuccessEnvelope(
      { topology, gates: gateResults, summary },
      {
        command: 'evolith validate',
        executedAt: evaluatedAt,
        durationMs: 0,
        correlationId: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        schemaVersion: '1.0.0',
      },
    );

    return {
      // GT-395: gate-level verdicts AND general ruleset enforcement both gate the verdict
      passed: gateResults.every(g => g.verdict === 'passed'),
      resolvedTopology: topology,
      gates: gateResults,
      summary,
      evaluatedAt,
      outputEnvelope,
    };
  }

  /**
   * Returns the remediation text for a missing artifact.
   */
  private remediationFor(artifactName: string, ruleId: string, context: string): string {
    const map: Record<string, string> = {
      'docs/adrs': `Create an ADR at ${artifactName}/ following the template in docs/adrs/template.md`,
      'docs/decision-log.md': `Create ${artifactName} documenting key architectural decisions`,
      'topology.manifest.json': `Create ${artifactName} with topology metadata (see evolith init)`,
      'README.md': `Create ${artifactName} describing the satellite purpose, setup, and conventions`,
    };
    return map[artifactName] || `Ensure ${artifactName} exists and satisfies: ${context}`;
  }

  /**
   * Derives severity from the gate's blocking criteria. If any criterion
   * matches the artifact, the severity is 'error'; otherwise 'warning'.
   */
  private deriveSeverity(gate: StructuredGate, _artifactName: string): EvaluationSeverity {
    // Artifacts that have corresponding blocking criteria are errors
    const artifactKey = _artifactName.replace(/^docs\//, '').replace(/\.(md|json|yaml)$/, '');
    const hasBlockingCriterion = gate.blockingCriteria.some(c =>
      c.criterion.toLowerCase().includes(artifactKey.toLowerCase()),
    );
    return hasBlockingCriterion ? 'error' : 'warning';
  }

  private async evaluateGate(
    gate: StructuredGate,
    satellitePath: string,
    corePath: string,
    topology: string | null,
    facts?: EvaluationFacts,
  ): Promise<PipelineGateResult> {
    const evaluations: RuleEvaluation[] = [];

    for (const artifact of gate.requiredArtifacts) {
      const artifactPath = path.join(satellitePath, artifact.artifact);
      const artifactExists = await this.fs.exists(artifactPath);

      for (const rulePath of artifact.rules) {
        const resolved = path.resolve(corePath, rulePath);
        const ruleId = this.deriveRuleId(rulePath);
        const severity = this.deriveSeverity(gate, artifact.artifact);

        if (!artifactExists) {
          evaluations.push({
            ruleId,
            rulePath,
            artifact: artifact.artifact,
            passed: false,
            message: `Missing required artifact '${artifact.artifact}': ${artifact.validation}`,
            severity,
            remediation: this.remediationFor(artifact.artifact, ruleId, artifact.validation),
            gateRef: gate.id,
          });
          continue;
        }

        // Evaluate the rule using OpaEvaluator (GT-362)
        const ruleExists = await this.fs.exists(resolved);
        if (!ruleExists) {
          evaluations.push({
            ruleId,
            rulePath,
            artifact: artifact.artifact,
            passed: false,
            message: `Rule file not found: ${rulePath}`,
            severity: 'error',
            remediation: `Ensure the Rego rule exists at ${rulePath} or update the gate definition for ${gate.id}`,
            gateRef: gate.id,
          });
          continue;
        }

        const opaResults = await this.opaEvaluator.evaluateAll(
          [{
            id: ruleId,
            category: 'sdlc',
            severity: severity === 'error' ? 'MUST' : 'SHOULD',
            title: ruleId,
            description: artifact.validation,
            engine: 'opa',
          } as any],
          { satellitePath, corePath, facts }
        );

        const opaResult = opaResults[0];
        // 'failed' = policy evaluated and found a violation.
        // 'skipped' = policy could not execute (defense-in-depth: treat as blocking).
        const opaBlocking = opaResult && (opaResult.result === 'failed' || opaResult.result === 'skipped');
        if (opaBlocking) {
          evaluations.push({
            ruleId,
            rulePath,
            artifact: artifact.artifact,
            passed: false,
            message: opaResult.message || `OPA policy evaluation failed for rule ${ruleId}`,
            severity,
            remediation: this.remediationFor(artifact.artifact, ruleId, artifact.validation),
            gateRef: gate.id,
          });
          continue;
        }

        evaluations.push({
          ruleId,
          rulePath,
          artifact: artifact.artifact,
          passed: true,
          message: `Artifact '${artifact.artifact}' present and satisfies rule ${ruleId}`,
          severity,
          remediation: '',
          gateRef: gate.id,
        });
      }
    }

    const allPassed = evaluations.every(e => e.passed);
    return {
      gateId: gate.id,
      gateName: gate.name,
      phase: gate.phase,
      verdict: allPassed ? 'passed' : 'failed',
      artifactEvaluations: evaluations,
    };
  }

  private async resolveTopology(satellitePath: string, corePath: string): Promise<string | null> {
    try {
      // First, check if there's a topology.manifest.json in the satellite
      const manifestPath = path.join(satellitePath, 'topology.manifest.json');
      if (await this.fs.exists(manifestPath)) {
        const raw = await this.fs.readFile(manifestPath);
        const manifest = JSON.parse(raw) as TopologyManifest;
        return manifest.metadata?.id ?? null;
      }

      // Auto-detect from evolith.yaml
      const yamlPath = path.join(satellitePath, 'evolith.yaml');
      if (await this.fs.exists(yamlPath)) {
        const yamlContent = await this.fs.readFile(yamlPath);
        // Simple heuristic: look for topology field in yaml
        const match = yamlContent.match(/topology:\s*['"]?([a-z][a-z0-9_-]+)['"]?/i);
        if (match) return match[1];
      }
    } catch {
      // Silently fall through
    }
    return null;
  }

  private discoverCorePath(satellitePath: string): string {
    const parts = satellitePath.split(path.sep);
    while (parts.length > 0) {
      parts.pop();
      try {
        const candidate = path.join(parts.join(path.sep), 'rulesets');
        if (this.fs.existsSync(candidate)) {
          return parts.join(path.sep);
        }
      } catch {
        continue;
      }
    }
    return path.join(satellitePath, '..', 'evolith');
  }

  /**
   * GT-395: Converts the general ruleset validation result into a synthetic
   * PipelineGateResult. Blocking issues produce a 'failed' gate; non-blocking
   * issues produce a 'passed' gate (warnings only). Returns null when there
   * are no issues at all (no synthetic gate needed).
   */
  private buildGeneralRulesetsGate(
    generalResult: { status: string; issues: Array<{ ruleId: string; severity: string; category: string; title: string; description: string; blocking: boolean; file?: string }>; rulesChecked: number },
  ): PipelineGateResult | null {
    if (generalResult.issues.length === 0) return null;

    const evaluations: RuleEvaluation[] = generalResult.issues.map(issue => ({
      ruleId: issue.ruleId,
      rulePath: `rulesets/${issue.category}/${issue.ruleId}`,
      artifact: issue.file || issue.category,
      passed: !issue.blocking,
      message: `${issue.title}: ${issue.description}`,
      severity: issue.severity === 'MUST' ? 'error' as EvaluationSeverity : 'warning' as EvaluationSeverity,
      remediation: '',
      gateRef: 'general-rulesets',
    }));

    return {
      gateId: 'general-rulesets',
      gateName: 'Canonical Ruleset Enforcement',
      phase: 'cross',
      verdict: evaluations.every(e => e.passed) ? 'passed' : 'failed',
      artifactEvaluations: evaluations,
    };
  }

  private deriveRuleId(rulePath: string): string {
    return rulePath
      .replace(/^.*rulesets\//, '')
      .replace(/\.rego$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-');
  }
}
