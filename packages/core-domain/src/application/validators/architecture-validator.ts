/* eslint-disable boundaries/element-types */
import * as path from 'path';
import { IFileSystem } from '../../domain/interfaces';
import { NormalizedRule } from '../../domain/models/normalized-rule';
import { TopologyCatalogService } from '../services/topology-catalog.service';
import { RuleEvaluationEngine } from './rule-evaluation-engine';
import { ArchitectureValidationResult, ValidationIssue } from './ruleset-validator.types';

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
  let rulesChecked = 0;
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
    rulesChecked += rules.length;

    for (const rule of rules) {
      const normalized: Record<string, unknown> = { ...rule, sourceFile: rulesetPath };
      const results = await deps.engine['strategy'].evaluateAll([normalized as unknown as NormalizedRule], ctx);
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
    rulesChecked,
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
  return path.join(corePath, 'reference', 'architecture', 'topologies', 'progressive-axis', profile, `${profile}.rules.json`);
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
