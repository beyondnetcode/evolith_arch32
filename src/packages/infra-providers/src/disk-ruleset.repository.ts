import * as path from "path";
import { IFileSystem, ILogger } from "@beyondnet/evolith-core-domain/domain/interfaces";
import { NormalizedRule } from "@beyondnet/evolith-core-domain/domain/models/normalized-rule";
import {
  CorpusDocumentOutcome,
  IRulesetRepository,
  RulesetCorpusNotResolvedError,
  RulesetsNotFoundError,
} from "@beyondnet/evolith-core-domain/domain/ports/ruleset-repository.port";
import {
  describeRulesetsResolutionFailure,
  probeRulesetsLocation,
} from "@beyondnet/evolith-core-domain/application/paths/rulesets-location";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { ValidateFunction } from "ajv";

export { RulesetCorpusNotResolvedError, RulesetsNotFoundError };

/**
 * GT-649 — document kinds that legitimately live in the corpus tree under the
 * `*.rules.json` suffix but are NOT corpus rulesets, keyed by the basename of
 * the `$schema` they declare.
 *
 * The loader used to run every `*.rules.json` through the standard ruleset
 * schema, so each of these failed with `must have required property 'rules' /
 * 'principles'` and was logged as a skipped "non-standard ruleset" — on every
 * evaluation, which is how they showed up once per k6 iteration in CI run
 * 30631939687. Nothing was wrong with them: they are different documents that
 * share a suffix, and the loader had no way to say so.
 *
 * A file listed here is validated against its OWN declared schema instead. That
 * is strictly more checking than before, not less — the previous behaviour
 * checked them against a schema they were never meant to satisfy and then
 * discarded the result. Only a document that violates its own contract warns.
 */
const NON_CORPUS_DOCUMENT_KINDS: ReadonlyMap<string, string> = new Map([
  [
    "rule-definition.schema.json",
    "a single rule declaration, enforced by its paired CI guard and Rego policy rather than by the rule engine",
  ],
  [
    "topology-recommendation.schema.json",
    "the ADR-0104 advisory topology recommendation catalogue, read by TopologyRecommendationService",
  ],
  // #575: this one used to be recognised by FILENAME -- `filePath.endsWith(
  // "phase-gates.rules.json")` skipped standard validation and then normalised
  // to zero rules, so the document was neither validated nor reported. It
  // declares its own schema like the others; dispatching on that declaration
  // puts it in the same accounting as its neighbours and removes a path literal
  // that a rename would have silently defeated.
  [
    "ruleset-sdlc.schema.json",
    "an SDLC phase-gate document, evaluated by PhaseGateValidator rather than by the rule engine",
  ],
]);

/**
 * Corpus-root-relative path, so a reported file reads the same on every machine
 * and in every container. Falls back to the basename if the path is not under
 * the root, which should not happen but must not produce an absolute path in a
 * published report.
 */
function relativeToCorpus(filePath: string, rulesetsDir: string): string {
  const prefix = rulesetsDir.endsWith(path.sep)
    ? rulesetsDir
    : rulesetsDir + path.sep;
  return filePath.startsWith(prefix)
    ? filePath.slice(prefix.length).split(path.sep).join("/")
    : (filePath.split(path.sep).pop() ?? filePath);
}

/** Basename of a declared `$schema`, or `undefined` when none is declared. */
function declaredSchemaName(parsed: Record<string, unknown>): string | undefined {
  const raw = parsed["$schema"];
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  // `$schema` is authored as a relative path (and several are stale after the
  // reference/ reorganisation), so only the filename is trustworthy.
  return raw.split(/[\\/]/).pop();
}

/**
 * Disk-backed implementation of {@link IRulesetRepository}.
 *
 * Reads `*.rules.json` files under the Core rulesets root, validates each one
 * against the standard ruleset JSON schema, and normalizes them into
 * {@link NormalizedRule} entries consumed by the validators.
 *
 * Lives in the shared infrastructure layer so any consumer (Evolith CLI, MCP
 * Gateway, REST API) can build a ruleset repository without depending on the
 * CLI package.
 */
export class DiskRulesetRepository implements IRulesetRepository {
  private readonly ajv: Ajv;
  private validateSchema?: ValidateFunction;
  /** GT-649 — compiled validators for the non-corpus kinds, by schema filename. */
  private readonly sideSchemas = new Map<string, ValidateFunction | null>();

  constructor(
    private readonly fs: IFileSystem,
    private readonly logger: ILogger,
  ) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  /**
   * GT-474: rulesets live either directly under `<corePath>/rulesets` (the
   * rulesets bundled with the CLI package) or under `<corePath>/src/rulesets`
   * (the Evolith Core monorepo layout, post apps/→src/ migration). Probe both.
   *
   * GT-566: probe by CONTENT, not existence. Both paths exist in the Core
   * monorepo — `<repo>/rulesets` is the satellite-side agents directory
   * (`rulesets/agents`, read by AgentRegistryService), not a corpus. An
   * existence check latched onto it and never saw the 145-file corpus at
   * `<repo>/src/rulesets`, so `CORE_PATH=<repo root>` 422'd with
   * `RULESET_NOT_FOUND` — a message about a missing ruleset for what was
   * actually a resolution that stopped at the wrong tree. The shared decision
   * (and its actionable failure message) lives in core-domain so this
   * repository, the CLI resolver and the validators cannot drift apart again.
   */
  private async resolveRulesetsDir(corePath: string): Promise<string> {
    const { rulesetsRoot, probes } = await probeRulesetsLocation(
      corePath,
      {
        exists: (p) => this.fs.exists(p),
        readdirNames: (p) => this.fs.readdirNames(p),
      },
      path.sep,
    );

    if (!rulesetsRoot) {
      // Not a `RulesetsNotFoundError`: the corpus ROOT is unlocatable, which is
      // a configuration fault, not a missing ruleset. The subclass lets surfaces
      // report it as such while every existing catch-site still matches.
      throw new RulesetCorpusNotResolvedError(
        describeRulesetsResolutionFailure(corePath, probes),
      );
    }

    return rulesetsRoot;
  }

  /**
   * #575: what the last load did with every document that produced no rules.
   * Replaced (not appended to) on each load, so it always describes the corpus
   * the caller just read rather than accumulating across calls.
   */
  private lastLoad: CorpusDocumentOutcome[] = [];

  describeLastLoad(): readonly CorpusDocumentOutcome[] {
    return this.lastLoad;
  }

  async loadAllRulesets(corePath: string): Promise<NormalizedRule[]> {
    // GT-474: a missing rulesets root is a HARD error. Returning [] here made
    // `validate` check zero rules and still report a (non-blocking) `warning` —
    // a governance tool that silently validates nothing is worse than one that
    // crashes, because the operator reads "warning" as "checked, mostly passed".
    const rulesetsDir = await this.resolveRulesetsDir(corePath);

    const files = await this.findRulesetFiles(rulesetsDir);
    const rules: NormalizedRule[] = [];
    const outcomes: CorpusDocumentOutcome[] = [];

    for (const filePath of files) {
      const content = await this.fs.readFile(filePath);

      // A syntactically malformed `*.rules.json` (JSON parse error) is a corrupt
      // corpus, NOT a tolerable "non-standard" ruleset: fail hard so validation
      // never silently proceeds on a broken file (skipping it could zero out
      // real rules). Only VALID-but-non-standard rulesets are skipped (below).
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content) as Record<string, unknown>;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Ruleset validation error in ${filePath}: ${message}`);
        throw new Error(`Ruleset validation error: ${filePath}: ${message}`);
      }

      // GT-649: a document that declares a known non-corpus schema is a
      // different kind, not a broken ruleset. Check it against the contract it
      // actually claims and move on — it contributes no rules by design.
      const kind = NON_CORPUS_DOCUMENT_KINDS.get(
        declaredSchemaName(parsed) ?? "",
      );
      if (kind) {
        outcomes.push({
          file: relativeToCorpus(filePath, rulesetsDir),
          outcome: "classified",
          declaredSchema: declaredSchemaName(parsed),
          detail: kind,
        });
        await this.checkNonCorpusDocument(parsed, filePath, rulesetsDir, kind);
        continue;
      }

      try {
        if (!this.validateSchema) {
          const schemaPath = path.join(
            rulesetsDir,
            "schema",
            "ruleset-standard.schema.json",
          );
          const schemaContent = await this.fs.readFile(schemaPath);
          this.validateSchema = this.ajv.compile(JSON.parse(schemaContent));
        }
        const valid = this.validateSchema(parsed);
        if (!valid) {
          throw new Error(
            `Schema validation failed: ${this.ajv.errorsText(this.validateSchema.errors)}`,
          );
        }

        const relative = filePath.replace(corePath + path.sep, "");
        rules.push(...this.normalizeRuleset(parsed, relative));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        // GT-456: a single VALID-but-non-standard `*.rules.json` (e.g. a
        // recommendation ruleset that doesn't match the standard schema) must
        // NOT abort the whole load — that would zero out ALL validation and make
        // `validate` silently check nothing. Skip it with a warning and keep
        // evaluating the remaining rulesets. (Malformed JSON is a hard error,
        // handled above.)
        // #575: the warning stays, but it is no longer the ONLY trace. A
        // rejected document now reaches the report, where a reader looking at
        // `--format json` or an exit code can see it.
        this.logger.warn(
          `Skipping non-standard ruleset ${filePath}: ${message}`,
        );
        outcomes.push({
          file: relativeToCorpus(filePath, rulesetsDir),
          outcome: "rejected",
          declaredSchema: declaredSchemaName(parsed),
          detail: message,
        });
        continue;
      }
    }

    // GT-474: the rulesets root exists but yielded nothing — an empty corpus, a
    // wrong `--core`, or every ruleset skipped as non-standard. Whatever the
    // cause, zero rules must never flow downstream as a passable result.
    if (rules.length === 0) {
      throw new RulesetsNotFoundError(
        `No rulesets loaded from "${rulesetsDir}" (${files.length} ruleset file(s) found, 0 rules normalized). ` +
          `Refusing to validate against an empty ruleset corpus.`,
      );
    }

    this.lastLoad = outcomes;
    return rules;
  }

  /**
   * GT-649 — validate a non-corpus document against the schema it declares.
   *
   * Failing this is a WARN, never a throw: these documents contribute no rules,
   * so a malformed one cannot zero out validation the way a broken corpus
   * ruleset can (which is why {@link loadAllRulesets} throws for those). A
   * missing schema file is likewise not fatal — the corpus may be a published
   * subset that ships rules without the authoring schemas.
   */
  private async checkNonCorpusDocument(
    parsed: Record<string, unknown>,
    filePath: string,
    rulesetsDir: string,
    kind: string,
  ): Promise<void> {
    const schemaName = declaredSchemaName(parsed)!;

    if (!this.sideSchemas.has(schemaName)) {
      try {
        const schemaContent = await this.fs.readFile(
          path.join(rulesetsDir, "schema", schemaName),
        );
        this.sideSchemas.set(
          schemaName,
          this.ajv.compile(JSON.parse(schemaContent)),
        );
      } catch {
        // `null` = "looked, not available" — cached so one absent schema does
        // not re-hit the filesystem for every document that declares it.
        this.sideSchemas.set(schemaName, null);
      }
    }

    const validate = this.sideSchemas.get(schemaName);
    if (validate && !validate(parsed)) {
      this.logger.warn(
        `${filePath} declares ${schemaName} but does not satisfy it: ${this.ajv.errorsText(validate.errors)}`,
      );
      return;
    }

    this.logger.debug(`Not a corpus ruleset, skipped: ${filePath} — ${kind}`);
  }

  private async findRulesetFiles(dir: string, depth = 0): Promise<string[]> {
    if (depth > 4) return [];
    const files: string[] = [];
    const entries = await this.fs.readdirNames(dir);
    entries.sort();

    for (const entry of entries) {
      const full = path.join(dir, entry);
      if (entry.endsWith(".rules.json")) {
        files.push(full);
        continue;
      }
      if (!entry.includes(".")) {
        const stat = await this.fs.stat(full);
        if (stat?.isDirectory?.()) {
          files.push(...(await this.findRulesetFiles(full, depth + 1)));
        }
      }
    }

    return files;
  }

  private normalizeRuleset(
    parsed: Record<string, unknown>,
    sourceFile: string,
  ): NormalizedRule[] {
    const rawList = (parsed["rules"] ?? parsed["principles"]) as
      | Array<Record<string, unknown>>
      | undefined;
    if (!Array.isArray(rawList)) return [];

    if (rawList.length > 0 && !rawList[0]["id"] && rawList[0]["rules"])
      return [];

    return rawList
      .filter((r) => Boolean(r["id"]))
      .map((r) => ({
        id: String(r["id"]),
        severity: this.normalizeSeverity(r),
        category: this.deriveCategory(r),
        title: String(r["title"] ?? r["principle"] ?? r["id"]),
        description: String(r["description"] ?? r["statement"] ?? ""),
        blocking: Boolean(r["blocking"] ?? this.defaultBlocking(r)),
        validationQuery: r["validationQuery"]
          ? String(r["validationQuery"])
          : undefined,
        enforce: this.normalizeEnforce(r["enforce"]),
        sourceFile,
      }));
  }

  /**
   * GT-632 — carry the authored `enforce:` block into the normalized rule.
   *
   * This mapping did not exist. `ruleset-standard.schema.json` has accepted an
   * `enforce` block since GT-516 and the ADR-0002 ruleset authors six of them,
   * but `normalizeRuleset` never copied the field — so `rule.enforce` was
   * ALWAYS `undefined` in production, `EnforcerEvaluator.isEnforcerRule()` was
   * always false, and the whole enforcement subsystem (adapters, sandbox,
   * composite, the `processRunner` injected by all three surfaces) was
   * unreachable code. HXA-01/02/04/05 declared `blocking: true` and a complete
   * `from`/`to` clause, and nothing ever read either.
   *
   * Unknown/extra keys are preserved verbatim under `config`; the block is only
   * shaped enough to be routable, because the consumers (PolicyCompiler,
   * ModuleBoundaryRuleHandler) own its interpretation.
   */
  private normalizeEnforce(raw: unknown): NormalizedRule["enforce"] {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
    const e = raw as Record<string, unknown>;
    const engine = String(e["engine"] ?? "native");
    if (engine !== "native" && engine !== "opa" && engine !== "enforcer")
      return undefined;
    if (!e["tool"]) return undefined;

    const config =
      e["config"] && typeof e["config"] === "object" && !Array.isArray(e["config"])
        ? (e["config"] as Record<string, unknown>)
        : undefined;
    const severityMap =
      e["severityMap"] &&
      typeof e["severityMap"] === "object" &&
      !Array.isArray(e["severityMap"])
        ? (e["severityMap"] as Record<string, string>)
        : undefined;
    const mode = e["mode"] === "warn" || e["mode"] === "block" ? e["mode"] : undefined;
    const runtime = ["node", "dotnet", "php", "python", "iac", "shell"].includes(
      String(e["runtime"]),
    )
      ? (String(e["runtime"]) as NonNullable<NormalizedRule["enforce"]>["runtime"])
      : undefined;

    // The cast is against a STALE artifact, not against the contract: this file
    // compiles from source while `@beyondnet/evolith-core-domain` resolves to its
    // published `dist/`, whose `EnforceDescriptor` may predate the widening that
    // added `config`/`configRef`/`mode`/`severityMap`. The literal below IS an
    // EnforceDescriptor; it stops being a cast the next time core-domain builds.
    return {
      engine,
      tool: String(e["tool"]),
      toolRuleId: e["toolRuleId"] ? String(e["toolRuleId"]) : undefined,
      runtime,
      config,
      configRef: e["configRef"] ? String(e["configRef"]) : undefined,
      mode,
      severityMap,
    } as NormalizedRule["enforce"];
  }

  private normalizeSeverity(
    r: Record<string, unknown>,
  ): NormalizedRule["severity"] {
    const raw = String(r["severity"] ?? "")
      .toUpperCase()
      .trim();
    if (raw === "MUST NOT") return "MUST NOT";
    if (raw === "MUST") return "MUST";
    if (raw === "SHOULD") return "SHOULD";
    if (raw === "COULD" || raw === "MAY") return "COULD";
    return r["blocking"] === true || r["enforcement"] ? "MUST" : "SHOULD";
  }

  private defaultBlocking(r: Record<string, unknown>): boolean {
    const sev = String(r["severity"] ?? "").toUpperCase();
    return sev === "MUST" || sev === "MUST NOT";
  }

  private deriveCategory(r: Record<string, unknown>): string {
    if (r["category"]) return String(r["category"]);

    const prefix = String(r["id"] ?? "")
      .replace(/-(?:EVD|RR|PAR)-?\d*$/, "")
      .replace(/-\d+$/, "")
      .toLowerCase();

    const map: Record<string, string> = {
      inh: "inheritance",
      acl: "anti-corruption",
      ocb: "open-core",
      gov: "governance",
      evd: "identity",
      "obs-evd": "tracing",
      dep: "version-pinning",
      tax: "naming-conventions",
      hxa: "layer-structure",
      git: "branch-naming",
      cicd: "ci-cd",
      tpy: "testing-pyramid",
      mtn: "multi-tenancy",
      prot: "protocol",
      runt: "multi-runtime",
      dora: "metrics",
      space: "metrics",
      drift: "governance",
      "cli-rr": "build",
      "cli-par": "shared-logic",
      mcp: "protocol",
      // Canonical progressive-axis topology ids (see reference/architecture/topologies/progressive-axis/*).
      // Previously stale F#-phase keys (f1/f2/f3); GT-351/GT-343.
      "modular-monolith": "topology",
      "distributed-modules": "module-autonomy",
      microservices: "autonomous-deployment",
    };

    return map[prefix] ?? "general";
  }
}
