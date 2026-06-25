import * as path from "path";
import { IFileSystem, ILogger } from "@evolith/core-domain/domain/interfaces";
import { NormalizedRule } from "@evolith/core-domain/domain/models/normalized-rule";
import { IRulesetRepository } from "@evolith/core-domain/domain/ports/ruleset-repository.port";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { ValidateFunction } from "ajv";

/**
 * Disk-backed implementation of {@link IRulesetRepository}.
 *
 * Reads `*.rules.json` files under `<corePath>/rulesets`, validates each one
 * against the standard ruleset JSON schema, and normalizes them into
 * {@link NormalizedRule} entries consumed by the validators.
 *
 * Lives in the shared infrastructure layer so any consumer (Smart CLI, MCP
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
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
  }

  async loadAllRulesets(corePath: string): Promise<NormalizedRule[]> {
    const rulesetsDir = path.join(corePath, "rulesets");
    if (!(await this.fs.exists(rulesetsDir))) return [];

    const files = await this.findRulesetFiles(rulesetsDir);
    const rules: NormalizedRule[] = [];

    for (const filePath of files) {
      try {
        const content = await this.fs.readFile(filePath);
        const parsed = JSON.parse(content) as Record<string, unknown>;

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
        this.logger.error(
          `Malformed ruleset detected at ${filePath}: ${message}`,
        );
        throw new Error(`Ruleset validation error in ${filePath}: ${message}`);
      }
    }

    return rules;
  }

  private async findRulesetFiles(dir: string, depth = 0): Promise<string[]> {
    if (depth > 4) return [];
    const files: string[] = [];
    const entries = await this.fs.readdirNames(dir);

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
        sourceFile,
      }));
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
      f1: "topology",
      f2: "module-autonomy",
      f3: "autonomous-deployment",
    };

    return map[prefix] ?? "general";
  }
}
