import * as path from 'path';
import { Injectable, Inject } from '@nestjs/common';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import {
  describeRulesetsResolutionFailure,
  probeRulesetsLocation,
} from '@beyondnet/evolith-core-domain/application/paths/rulesets-location';
import { RulesetCorpusNotResolvedError } from '@beyondnet/evolith-core-domain/domain/ports/ruleset-repository.port';

export interface RulesetSummary {
  id: string;
  title: string;
  description: string;
  version?: string;
}

export interface PhaseGate {
  phase: number;
  name: string;
  description: string;
  mandatoryEvidence: unknown[];
  blockingCriteria: unknown[];
  accountableRole: string;
  waiverAuthority: string;
  waiverRequiredFields: string[];
}

@Injectable()
export class CoreReferenceQueryService {
  constructor(@Inject('IFileSystem') private readonly fs: IFileSystem) {}

  async listRulesets(corePath: string): Promise<RulesetSummary[]> {
    const files = await this.findAllRulesetFiles(corePath);
    const results = await Promise.allSettled(files.map(async (file) => {
      const content = await this.fs.readFile(file);
      const parsed = JSON.parse(content) as Record<string, unknown>;
      return this.toSummary(parsed, path.relative(corePath, file));
    }));
    return results
      .filter((r): r is PromiseFulfilledResult<RulesetSummary> => r.status === 'fulfilled')
      .map((r) => r.value)
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  async getRuleset(corePath: string, rulesetId: string): Promise<Record<string, unknown> | undefined> {
    const files = await this.findAllRulesetFiles(corePath);
    for (const file of files) {
      try {
        const parsed = JSON.parse(await this.fs.readFile(file)) as Record<string, unknown>;
        if (this.toSummary(parsed, path.relative(corePath, file)).id === rulesetId) {
          return parsed;
        }
      } catch {
        // skip malformed file
      }
    }
    return undefined;
  }

  async getGate(corePath: string, gateId: string): Promise<PhaseGate | undefined> {
    const phase = this.parsePhase(gateId);
    return (await this.loadPhaseGates(corePath)).find((gate) => gate.phase === phase);
  }

  async getPhaseRequirements(corePath: string, phase: string): Promise<PhaseGate | undefined> {
    const phaseNumber = this.parsePhase(phase);
    return (await this.loadPhaseGates(corePath)).find((gate) => gate.phase === phaseNumber);
  }

  /**
   * Every file the reference surface considers a ruleset, from the RESOLVED
   * corpus root.
   *
   * GT-566: this used to scan `<corePath>/rulesets` unconditionally. Against a
   * Core monorepo checkout that directory holds only `agents/`, so
   * `GET /reference/rulesets` answered `[]` — "this Core has no rulesets" — for
   * a Core with a 145-file corpus one directory over. An empty list is the
   * worst possible answer here because it looks like a successful query. Fail
   * closed instead: if the corpus cannot be located, say so and say where we
   * looked.
   */
  private async findAllRulesetFiles(corePath: string): Promise<string[]> {
    const { rulesetsRoot, probes } = await probeRulesetsLocation(
      corePath,
      { exists: (p) => this.fs.exists(p), readdirNames: (p) => this.fs.readdirNames(p) },
      path.sep,
    );
    if (!rulesetsRoot) {
      throw new RulesetCorpusNotResolvedError(
        describeRulesetsResolutionFailure(corePath, probes),
      );
    }
    return [
      ...(await this.findRulesetFiles(rulesetsRoot)),
      ...(await this.findRulesetFiles(path.join(corePath, 'reference', 'architecture', 'topologies'))),
    ];
  }

  private async loadPhaseGates(corePath: string): Promise<PhaseGate[]> {
    // GT-566: probe both corpus layouts rather than only `<core>/rulesets`.
    const candidates = [
      path.join(corePath, 'rulesets', 'sdlc', 'phase-gates.rules.json'),
      path.join(corePath, 'src', 'rulesets', 'sdlc', 'phase-gates.rules.json'),
    ];
    for (const candidate of candidates) {
      if (await this.fs.exists(candidate)) {
        const parsed = JSON.parse(await this.fs.readFile(candidate)) as { gates?: PhaseGate[] };
        return parsed.gates ?? [];
      }
    }
    return [];
  }

  private async findRulesetFiles(directory: string, depth = 0): Promise<string[]> {
    if (depth > 4 || !(await this.fs.exists(directory))) return [];
    const entries = await this.fs.readdir(directory);
    const files: string[] = [];
    for (const entry of entries) {
      const filePath = path.join(directory, entry.name);
      if (entry.isFile() && entry.name.endsWith('.rules.json')) files.push(filePath);
      if (entry.isDirectory()) files.push(...await this.findRulesetFiles(filePath, depth + 1));
    }
    return files;
  }

  private toSummary(ruleset: Record<string, unknown>, relativePath: string): RulesetSummary {
    // topology.manifest.json uses metadata.id; .rules.json uses $id
    const metadata = ruleset.metadata as Record<string, unknown> | undefined;
    const id = metadata?.id ?? ruleset.$id ?? relativePath.replace(/\.(rules|manifest)\.json$/, '');
    const title = metadata?.name ?? ruleset.title ?? relativePath;
    const spec = ruleset.spec as Record<string, unknown> | undefined;
    const description = spec?.summary ?? ruleset.description ?? '';
    const version = (metadata?.version ?? ruleset.version) as string | undefined;
    return {
      id: String(id),
      title: String(title),
      description: String(description),
      version: typeof version === 'string' ? version : undefined,
    };
  }

  private parsePhase(value: string): number {
    const match = value.match(/\d+/);
    return match ? Number(match[0]) : Number.NaN;
  }
}
