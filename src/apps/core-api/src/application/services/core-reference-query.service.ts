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

/** GT-650 / ADR-0125 — the published shape of the artifact registry. */
export interface RegistryArtifact {
  id: string;
  label: string;
  phases: string[];
  classification: 'binding' | 'advisory';
  schemaId?: string;
  templateRef?: string;
  producedBy?: { format: string; note?: string };
}

export interface ArtifactRegistry {
  phaseVocabulary: string[];
  artifacts: RegistryArtifact[];
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
   * GT-650 / ADR-0125 — the artifact registry, published.
   *
   * This is the half of the ADR a satellite was waiting for: `evolith_tracker` shipped a
   * hand-built mirror of the Core catalogue stamped `core-standin` precisely because there was
   * nothing to consume. Now there is.
   *
   * The response carries the schema's published `$id` and NOT a repository path, deliberately: a
   * path is a fact about where a file sits in one repository at one moment — and those paths were
   * in fact broken until `#378` — while the `$id` is the schema's own identity and survives the
   * Core reorganising its tree.
   */
  async getArtifactRegistry(corePath: string, phase?: string): Promise<ArtifactRegistry | undefined> {
    const rulesetsRoot = await this.resolveRulesetsRoot(corePath);
    const file = path.join(rulesetsRoot, 'sdlc', 'artifact-registry.json');
    if (!(await this.fs.exists(file))) return undefined;

    const registry = JSON.parse(await this.fs.readFile(file)) as ArtifactRegistry;
    if (!phase) return registry;

    // An unknown phase yields an EMPTY artifact list, never the whole registry. Falling back to
    // everything would answer a question nobody asked and read as "this phase requires all of it".
    return {
      ...registry,
      artifacts: registry.artifacts.filter((a) => a.phases.includes(phase)),
    };
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
    const rulesetsRoot = await this.resolveRulesetsRoot(corePath);
    return [
      ...(await this.findRulesetFiles(rulesetsRoot)),
      ...(await this.findRulesetFiles(this.topologyDocsRoot(corePath))),
    ];
  }

  /**
   * The doc-side topology corpus, which carries its own `*.rules.json` files
   * alongside the narrative pages and is NOT a subtree of the ruleset corpus.
   *
   * GT-632: this was `reference/architecture/topologies`, which the `src/` move
   * relocated under `reference/core/`. `findRulesetFiles` returns `[]` for a
   * directory that does not exist, so the three doc-side topology rulesets
   * simply stopped appearing in `GET /reference/rulesets` — a silent shortfall,
   * not an error, and therefore invisible.
   */
  private topologyDocsRoot(corePath: string): string {
    return path.join(corePath, 'reference', 'core', 'architecture', 'topologies');
  }

  /**
   * Resolve the ruleset corpus root, failing closed with the probe trail.
   *
   * GT-566 put the two legitimate corpus layouts (`<core>/rulesets` for the
   * published CLI bundle, `<core>/src/rulesets` for the monorepo) behind one
   * content-qualified probe. Anything that re-states those layouts by hand
   * drifts away from it.
   */
  private async resolveRulesetsRoot(corePath: string): Promise<string> {
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
    return rulesetsRoot;
  }

  /**
   * GT-632: this hand-rolled the GT-566 layout probe as two literal candidates,
   * and the first — `<core>/rulesets/sdlc/phase-gates.rules.json` — named a
   * layout that no longer exists in this repository. It was harmless only by
   * luck: the second candidate still resolved, so the dead one cost nothing but
   * would have been the answer had the order been the other way round. Delegate
   * to the single content-qualified resolver instead of restating the layouts.
   *
   * Failing closed (rather than returning `[]`) matches `findAllRulesetFiles`:
   * an empty gate list makes an unreachable corpus look like a gate that does
   * not exist, and the caller answers 404 for what is really a misconfiguration.
   */
  private async loadPhaseGates(corePath: string): Promise<PhaseGate[]> {
    const rulesetsRoot = await this.resolveRulesetsRoot(corePath);
    const gatesFile = path.join(rulesetsRoot, 'sdlc', 'phase-gates.rules.json');
    if (!(await this.fs.exists(gatesFile))) return [];
    const parsed = JSON.parse(await this.fs.readFile(gatesFile)) as { gates?: PhaseGate[] };
    return parsed.gates ?? [];
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
