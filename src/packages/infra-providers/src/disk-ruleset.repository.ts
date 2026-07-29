import * as path from "path";
import { IFileSystem, ILogger } from "@beyondnet/evolith-core-domain/domain/interfaces";
import { NormalizedRule } from "@beyondnet/evolith-core-domain/domain/models/normalized-rule";
import {
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

  async loadAllRulesets(corePath: string): Promise<NormalizedRule[]> {
    // GT-474: a missing rulesets root is a HARD error. Returning [] here made
    // `validate` check zero rules and still report a (non-blocking) `warning` —
    // a governance tool that silently validates nothing is worse than one that
    // crashes, because the operator reads "warning" as "checked, mostly passed".
    const rulesetsDir = await this.resolveRulesetsDir(corePath);

    const files = await this.findRulesetFiles(rulesetsDir);
    const rules: NormalizedRule[] = [];

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

      try {
        // Exclude SDLC gate rulesets from standard validation here since PhaseGateValidator handles them
        if (!filePath.endsWith("phase-gates.rules.json")) {
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
        this.logger.warn(
          `Skipping non-standard ruleset ${filePath}: ${message}`,
        );
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

    return rules;
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
