import * as path from 'path';
import { IFileSystem } from '../../domain/interfaces';
import { NormalizedRule } from '../../domain/models/normalized-rule';
import { TopologyCatalogService } from '../services/topology-catalog.service';
import { RuleEvaluationEngine, emptyRuleCoverage, mergeRuleCoverage, summarizeRuleCoverage } from './rule-evaluation-engine';
import { ArchitectureValidationResult, RuleCoverage, ValidationIssue } from './ruleset-validator.types';

export interface ArchitectureValidationDeps {
  fs: IFileSystem;
  engine: RuleEvaluationEngine;
  topologyCatalog?: TopologyCatalogService;
}

export interface ArchitectureValidationOptions {
  level?: string;
  topologies?: string[];
}

export async function runArchitectureValidation(
  deps: ArchitectureValidationDeps,
  satellitePath: string,
  resolvedCorePath: string,
  options?: ArchitectureValidationOptions,
): Promise<ArchitectureValidationResult> {
  const issues: ValidationIssue[] = [];
  // GT-569: this used to be `rulesChecked += rules.length` — every rule DECLARED
  // by the ruleset counted as checked, whether or not the engine could evaluate
  // it. The counter is now derived from the actual outcomes, and the rules that
  // did not run travel with it instead of vanishing.
  let coverage: RuleCoverage = emptyRuleCoverage();
  const rulesetPaths: string[] = [];

  if (options?.level || (!options?.level && (!options?.topologies || options.topologies.length === 0))) {
    const lvlOpt = options?.level || 'ALL';
    const levels = lvlOpt === 'ALL' ? ['F1', 'F2', 'F3'] : [lvlOpt];
    for (const lvl of levels) {
      rulesetPaths.push(await resolveArchitectureRuleset(deps.topologyCatalog, resolvedCorePath, lvl as 'F1' | 'F2' | 'F3'));
    }
  }

  if (options?.topologies && options.topologies.length > 0) {
    for (const topId of options.topologies) {
      const p = await resolveTopologyRuleset(deps.topologyCatalog, resolvedCorePath, topId);
      if (p) {
        rulesetPaths.push(p);
      } else {
        issues.push({
          ruleId: 'ARCH-TOPOLOGY-MISSING',
          severity: 'SHOULD',
          category: 'architecture',
          title: 'Topology ruleset not found',
          description: `Could not find ruleset for topology: ${topId}`,
          blocking: false,
        });
      }
    }
  }

  const uniquePaths = Array.from(new Set(rulesetPaths));
  const ctx = { satellitePath, corePath: resolvedCorePath };

  for (const rulesetPath of uniquePaths) {
    if (!await deps.fs.exists(rulesetPath)) {
      issues.push({
        ruleId: 'ARCH-RULESET-MISSING',
        severity: 'SHOULD',
        category: 'architecture',
        title: 'Ruleset not found',
        description: `Could not find architecture rules at ${rulesetPath}`,
        blocking: false,
      });
      continue;
    }

    const content = await deps.fs.readFile(rulesetPath);
    const ruleset = JSON.parse(content);
    const rules = ruleset.rules || [];

    for (const rule of rules) {
      const normalized: Record<string, unknown> = { ...rule, sourceFile: rulesetPath };
      const results = await deps.engine['strategy'].evaluateAll([normalized as unknown as NormalizedRule], ctx);
      coverage = mergeRuleCoverage(coverage, summarizeRuleCoverage(results));
      issues.push(...deps.engine.toValidationIssues(results));
    }
  }

  const blockingCount = issues.filter(i => i.blocking).length;

  const reportedLevels = (options?.level && options.level !== 'ALL' ? [options.level] : []);
  if (options?.level === 'ALL' || (!options?.level && (!options?.topologies || options.topologies.length === 0))) {
    reportedLevels.push('F1', 'F2', 'F3');
  }

  return {
    status: blockingCount > 0 ? 'failed' : 'passed',
    levels: Array.from(new Set([...reportedLevels, ...(options?.topologies || [])])),
    rulesChecked: coverage.rulesChecked,
    rulesSkipped: coverage.rulesSkipped,
    rulesErrored: coverage.rulesErrored,
    rulesTotal: coverage.rulesTotal,
    skippedRuleIds: coverage.skippedRuleIds,
    erroredRuleIds: coverage.erroredRuleIds,
    issues,
    timestamp: new Date().toISOString(),
  };
}

async function resolveArchitectureRuleset(
  catalog: TopologyCatalogService | undefined,
  corePath: string,
  level: 'F1' | 'F2' | 'F3',
): Promise<string> {
  if (catalog) {
    const manifest = await catalog.resolveProgressivePhase(corePath, level);
    const manifestRuleset = manifest?.spec.artifacts.rulesets[0];
    if (!manifestRuleset) {
      throw new Error(`No topology manifest ruleset is registered for progressive phase ${level}`);
    }
    return path.join(corePath, manifestRuleset);
  }
  const profile = level === 'F1' ? 'modular-monolith' : level === 'F2' ? 'distributed-modules' : 'microservices';
  return path.join(corePath, 'reference', 'core', 'architecture', 'topologies', 'progressive-axis', profile, `${profile}.rules.json`);
}

async function resolveTopologyRuleset(
  catalog: TopologyCatalogService | undefined,
  corePath: string,
  topologyId: string,
): Promise<string | undefined> {
  if (!catalog) return undefined;
  const manifest = await catalog.get(corePath, topologyId);
  const manifestRuleset = manifest?.spec.artifacts?.rulesets?.[0];
  if (!manifestRuleset) return undefined;
  return path.join(corePath, manifestRuleset);
}
