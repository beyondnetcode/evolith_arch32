import * as path from 'path';
import {
  deriveArtifactFields,
  schemaFileNameFromId,
  type ArtifactField,
} from './artifact-field-derivation';
import { Injectable, Inject } from '@nestjs/common';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import {
  describeRulesetsResolutionFailure,
  probeRulesetsLocation,
} from '@beyondnet/evolith-core-domain/application/paths/rulesets-location';
import { RulesetCorpusNotResolvedError } from '@beyondnet/evolith-core-domain/domain/ports/ruleset-repository.port';

export interface RulesetSummary {
  id: string;
  /**
   * GT-660 — the ref that `POST /evaluate` and `validate --select` actually
   * accept, which `id` is NOT reliably.
   *
   * `id` is whatever the ruleset declares: `metadata.id`, `$id`, or the relative
   * path with its extension stripped. Measured against `ruleMatchesRef` over
   * this corpus, **17 of 183** of those ids match no rule — so a client
   * following this endpoint's own advice («the ids published by
   * GET /rulesets») would receive a blocking `SEL-01` on 17 of them. `ref` is
   * the rule's `sourceFile`, which is the value the selector compares against,
   * so it always selects.
   *
   * `id` is kept, unchanged: it is a published field and some clients hold it.
   * This is additive — one endpoint, two fields, and the one that works is
   * documented as the one to select with.
   */
  ref: string;
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

  /**
   * The artifact's fields, derived from the schema its `schemaId` names.
   *
   * Absent when the artifact publishes no schema — a tool's own output declares `producedBy`
   * instead, and restating what the tool already publishes would rot the day the tool changes.
   */
  fields?: ArtifactField[];

  /**
   * Paths the derivation deliberately left out, with the reason. Reported so a consumer counting
   * sections against fields can see the difference is collections, not a truncated schema.
   */
  omittedFields?: { fieldPath: string; reason: string }[];
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

    const scoped = phase
      // An unknown phase yields an EMPTY artifact list, never the whole registry. Falling back to
      // everything would answer a question nobody asked and read as "this phase requires all of it".
      ? { ...registry, artifacts: registry.artifacts.filter((a) => a.phases.includes(phase)) }
      : registry;

    return { ...scoped, artifacts: await this.withFields(rulesetsRoot, scoped.artifacts) };
  }

  /**
   * Attaches each artifact's FIELDS, derived from the schema its `schemaId` names.
   *
   * This closes the half of the contract a satellite could not use. Publishing the `$id` told a
   * consumer that a PRD has a canonical shape somewhere; it did not tell it what a PRD contains,
   * and nothing dereferences an identity. Gate criteria resolve a field path, so without this the
   * tenant can configure a rule over a document that nothing will ever read — the gate checks that
   * a file exists and never what it says.
   *
   * A schema that cannot be read leaves the artifact WITHOUT fields rather than failing the whole
   * registry: one unreadable file must not take down the catalogue every other artifact needs.
   */
  /**
   * The corpus's Spanish field names, read once per call.
   *
   * A missing or unreadable glossary costs the Spanish labels and nothing else — the catalogue is
   * what every gate depends on, and no translation is worth taking it down for. An untranslated
   * field reaches a reader with its English name, which is plain rather than broken.
   */
  private async labelsEs(rulesetsRoot: string): Promise<Record<string, string>> {
    const file = path.join(rulesetsRoot, 'i18n', 'field-labels.es.json');
    if (!(await this.fs.exists(file))) return {};

    try {
      const parsed = JSON.parse(await this.fs.readFile(file)) as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
    } catch {
      return {};
    }
  }

  private async withFields(
    rulesetsRoot: string,
    artifacts: RegistryArtifact[],
  ): Promise<RegistryArtifact[]> {
    const labelsEs = await this.labelsEs(rulesetsRoot);

    return Promise.all(
      artifacts.map(async (artifact) => {
        if (!artifact.schemaId) return artifact;

        const fileName = schemaFileNameFromId(artifact.schemaId);
        if (!fileName) return artifact;

        const schemaFile = path.join(rulesetsRoot, 'schema', fileName);
        if (!(await this.fs.exists(schemaFile))) return artifact;

        try {
          const schema = JSON.parse(await this.fs.readFile(schemaFile));
          const { fields, omitted } = deriveArtifactFields(schema, { labelsEs });
          return {
            ...artifact,
            fields,
            ...(omitted.length > 0 ? { omittedFields: omitted } : {}),
          };
        } catch {
          // Malformed schema: the artifact still exists and is still demanded, it just cannot say
          // what it contains yet.
          return artifact;
        }
      }),
    );
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
      // GT-660 — the SELECTABLE name. The relative path is what a loaded rule
      // carries as `sourceFile`, and `sourceFile` is what the selector compares
      // against, so this is the one field a caller can round-trip through
      // `--select` / `policyRefs` without being told it does not exist.
      ref: relativePath,
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
