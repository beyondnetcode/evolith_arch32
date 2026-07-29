import * as path from 'path';
import { IFileSystem, IConfigParser } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';
import { getAllFilesRecursive } from './architecture/shared';

/** Files a source scan should read: implementation, not tests or declarations. */
const SOURCE_FILE = /\.(ts|js|mjs|cjs)$/;
const NOT_SOURCE = /(\.d\.ts|\.spec\.[tj]s|\.test\.[tj]s)$/;

/** Anything that stands a server up and accepts requests. */
const HTTP_SURFACE = /NestFactory\.create|https?\.createServer|require\(['"]express['"]\)|from\s+['"](express|fastify|koa)['"]|\.listen\s*\(/;

/**
 * SEC-RL-01 asks for "configurable window and limit values from environment
 * variables" — so the signal is an env READ whose name is about rate limiting,
 * not a hard-coded constant and not a library import.
 */
const RATE_LIMIT_ENV = /process\.env\.[A-Z0-9_]*(?:RATE_?LIMIT|THROTTLE)[A-Z0-9_]*/i;

/** SEC-RL-02: "configured via MCP_MAX_BODY_BYTES or equivalent". */
const BODY_LIMIT_ENV = /process\.env\.[A-Z0-9_]*(?:MAX_BODY|BODY_(?:BYTES|SIZE|LIMIT)|MAX_REQUEST_SIZE)[A-Z0-9_]*/i;

/** The multi-tenancy strategies ADR-0010 itself enumerates (`schemaStrategies`). */
const MTN_STRATEGIES = ['shared-schema', 'schema-per-tenant', 'db-per-tenant'];

/** A commitlint config, in every form the tool actually looks for. */
const COMMITLINT_FILES = [
  'commitlint.config.mjs', 'commitlint.config.cjs', 'commitlint.config.js', 'commitlint.config.ts',
  '.commitlintrc', '.commitlintrc.json', '.commitlintrc.yaml', '.commitlintrc.yml',
  '.commitlintrc.js', '.commitlintrc.cjs', '.commitlintrc.mjs',
];

interface SourceScan { httpSurface?: string; rateLimitEnv?: string; bodyLimitEnv?: string }

export class GovernanceRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem, private configParser: IConfigParser) {
  }

  canHandle(rule: NormalizedRule): boolean {
    return [
      'INH-01', 'INH-06', 'GOV-01', 'GOV-02', 'INH-02', 'OCB-01', 'ACL-01',
      // GT-595: config-shaped assertions that promised enforcement and skipped.
      'MTN-05', 'GIT-08', 'SEC-RL-01', 'SEC-RL-02',
    ].includes(rule.id);
  }

  async evaluate(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    if (rule.id === 'INH-01') {
      const satelliteRulesets = path.join(ctx.satellitePath, 'rulesets');
      if (ctx.satellitePath !== ctx.corePath && await this.fs.exists(satelliteRulesets)) {
        return { rule, result: 'failed', message: 'Satellite contains a rulesets/ directory — inheriting from Core only is required' };
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'INH-06') {
      if (ctx.satellitePath !== ctx.corePath) {
        const decisionsFile = path.join(ctx.satellitePath, 'DECISIONS.md');
        if (!await this.fs.exists(decisionsFile)) {
          return { rule, result: 'failed', message: 'Satellite missing DECISIONS.md in root directory' };
        }
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'GOV-01') {
      const evolithYamlPath = path.join(ctx.satellitePath, 'evolith.yaml');
      if (!await this.fs.exists(evolithYamlPath)) {
        return { rule, result: 'failed', message: 'Satellite repository must have evolith.yaml at root' };
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'GOV-02') {
      const evolithYamlPath = path.join(ctx.satellitePath, 'evolith.yaml');
      if (await this.fs.exists(evolithYamlPath)) {
        const content = await this.fs.readFile(evolithYamlPath);
        const yaml = this.configParser.parse(content) as Record<string, unknown>;
        if (!(yaml?.governance as Record<string, unknown>)?.version) {
          return { rule, result: 'failed', message: 'evolith.yaml should specify governance.version for change tracking' };
        }
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'INH-02') {
      const evolithYamlPath = path.join(ctx.satellitePath, 'evolith.yaml');
      if (await this.fs.exists(evolithYamlPath)) {
        const content = await this.fs.readFile(evolithYamlPath);
        const yaml = this.configParser.parse(content) as Record<string, unknown>;
        const version = (yaml?.coreRef as Record<string, unknown>)?.version as string | undefined;
        if (!version) {
          return { rule, result: 'failed', message: 'evolith.yaml must specify coreRef.version (semver). Unpinned references are prohibited.' };
        }
        if (!/^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(version)) {
          return { rule, result: 'failed', message: `coreRef.version "${version}" is not valid semver` };
        }
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'OCB-01') {
      const packageJsonPath = path.join(ctx.satellitePath, 'package.json');
      if (await this.fs.exists(packageJsonPath)) {
        const packageJson = await this.fs.readJson(packageJsonPath) as { license?: string };
        if (packageJson.license?.startsWith('Enterprise') || packageJson.license === 'UNLICENSED') {
          return { rule, result: 'failed', message: `Core artifacts cannot reference commercial or enterprise-only licenses. Found: ${packageJson.license}` };
        }
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'ACL-01') {
      const satelliteAclPath = path.join(ctx.satellitePath, 'acl');
      if (await this.fs.exists(satelliteAclPath)) {
        const aclDir = await this.fs.readdirNames(satelliteAclPath);
        if (aclDir.length === 0) {
          return { rule, result: 'failed', message: 'ACL directory is empty. External data ingestion will fail.' };
        }
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'MTN-05') return this.evaluateMtn05(rule, ctx);
    if (rule.id === 'GIT-08') return this.evaluateGit08(rule, ctx);
    if (rule.id === 'SEC-RL-01' || rule.id === 'SEC-RL-02') return this.evaluateRateLimiting(rule, ctx);

    return { rule, result: 'skipped', message: 'Unhandled governance rule' };
  }

  // -------------------------------------------------------------------------
  // GT-595 — MTN-05
  //
  // validationQuery: "evolith.yaml specifies boundedContexts[].persistence
  // strategy (shared-schema | schema-per-tenant | db-per-tenant)."
  //
  // ⚠ PARTIAL, and the reason is a conflict in the corpus rather than an
  // omission here. `schema/evolith-yaml.schema.json` declares
  // `spec.boundedContexts[].persistence` with
  // `enum: ["PostgreSQL","MongoDB","SQLServer","SQLite"]` — a DATABASE ENGINE —
  // under `additionalProperties: false`. A satellite that wrote
  // `persistence: schema-per-tenant` to satisfy MTN-05 as worded would fail
  // contract-schema validation, and one that satisfies the schema can never
  // match the three strategies MTN-05 names. The two vocabularies are
  // irreconcilable while both stand.
  //
  // So the clause implemented is the half both documents agree on: the
  // persistence decision must be DECLARED, per bounded context, before Phase 2
  // Design. The strategy-enum clause is deliberately NOT enforced, and the
  // verdict says so rather than reporting a full pass.
  // -------------------------------------------------------------------------
  private async evaluateMtn05(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const yamlPath = path.join(ctx.satellitePath, 'evolith.yaml');
    if (!await this.fs.exists(yamlPath)) {
      return { rule, result: 'failed', message: 'MTN-05: evolith.yaml is missing, so no persistence strategy can be declared' };
    }

    const parsed = this.configParser.parse(await this.fs.readFile(yamlPath)) as Record<string, unknown> | undefined;
    const spec = (parsed?.spec ?? parsed) as Record<string, unknown> | undefined;
    const contexts = spec?.boundedContexts;

    if (!Array.isArray(contexts) || contexts.length === 0) {
      return { rule, result: 'failed', message: 'MTN-05: evolith.yaml declares no spec.boundedContexts, so the multi-tenant persistence strategy is undeclared' };
    }

    const undeclared = contexts
      .map((raw, index) => {
        const ctxEntry = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
        const persistence = ctxEntry.persistence;
        const declared = typeof persistence === 'string' && persistence.trim().length > 0;
        return declared ? undefined : String(ctxEntry.name ?? `boundedContexts[${index}]`);
      })
      .filter((name): name is string => name !== undefined);

    if (undeclared.length > 0) {
      return { rule, result: 'failed', message: `MTN-05: bounded contexts without a declared persistence strategy: ${undeclared.join(', ')}` };
    }

    return {
      rule,
      result: 'passed',
      message: 'MTN-05: every bounded context declares a persistence strategy — declaration clause only. '
        + `The strategy-vocabulary clause (${MTN_STRATEGIES.join(' | ')}) is NOT enforced: evolith-yaml.schema.json `
        + 'restricts `persistence` to a database engine enum, so the rule as worded is unsatisfiable against the contract schema.',
    };
  }

  // -------------------------------------------------------------------------
  // GT-595 — GIT-08
  // validationQuery: "Commit messages validated via commitlint or equivalent.
  // Non-conforming commits blocked in CI."
  //
  // Decidable half: the tool must actually be present and configured. A history
  // scan is not available here (no VCS adapter), so what is asserted is the
  // configuration that makes the enforcement real — which is precisely the
  // failure mode GT-623 found: a commit-msg hook whose `else` branch printed
  // "commitlint is not installed — skipping" and exited zero.
  // -------------------------------------------------------------------------
  private async evaluateGit08(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const root = ctx.satellitePath;

    let configFile: string | undefined;
    for (const candidate of COMMITLINT_FILES) {
      if (await this.fs.exists(path.join(root, candidate))) { configFile = candidate; break; }
    }

    const packageJsonPath = path.join(root, 'package.json');
    const packageJson = await this.fs.exists(packageJsonPath)
      ? await this.fs.readJson(packageJsonPath) as Record<string, unknown>
      : undefined;

    if (!configFile && packageJson?.commitlint) configFile = 'package.json#commitlint';

    if (!configFile) {
      return { rule, result: 'failed', message: `GIT-08: no commitlint configuration found (looked for ${COMMITLINT_FILES.join(', ')} and package.json#commitlint) — Conventional Commits are mandated but not enforced` };
    }

    // A config that is never installed cannot run: GT-623's failing-open hook.
    const deps = {
      ...(packageJson?.dependencies as Record<string, string> | undefined),
      ...(packageJson?.devDependencies as Record<string, string> | undefined),
    };
    const installed = Object.keys(deps).some(name => name === 'commitlint' || name.startsWith('@commitlint/'));
    if (!installed) {
      return { rule, result: 'failed', message: `GIT-08: ${configFile} exists but no commitlint package is declared in dependencies or devDependencies — the check cannot run and fails open` };
    }

    return { rule, result: 'passed', message: `GIT-08: Conventional Commits enforced via ${configFile}` };
  }

  // -------------------------------------------------------------------------
  // GT-595 — SEC-RL-01 / SEC-RL-02
  //
  // Both are scoped to HTTP services ("All public HTTP endpoints", "All HTTP
  // services"), so applicability is established from the tree first: a
  // workspace that stands no server up is not exempted by fiat, it simply has
  // no endpoint to rate-limit, and the verdict says which file carried the
  // surface when there is one.
  // -------------------------------------------------------------------------
  private async evaluateRateLimiting(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const scan = await this.scanSources(ctx.satellitePath);

    if (!scan.httpSurface) {
      return { rule, result: 'passed', message: `${rule.id}: no HTTP surface found under src/ — no endpoint is exposed for this control to protect` };
    }

    if (rule.id === 'SEC-RL-01') {
      if (!scan.rateLimitEnv) {
        return { rule, result: 'failed', message: `SEC-RL-01: ${scan.httpSurface} exposes an HTTP surface but no rate limit is read from an environment variable (expected a process.env.*RATE_LIMIT*/THROTTLE* read)` };
      }
      return { rule, result: 'passed', message: `SEC-RL-01: rate limiting configured from the environment in ${scan.rateLimitEnv}` };
    }

    if (!scan.bodyLimitEnv) {
      return { rule, result: 'failed', message: `SEC-RL-02: ${scan.httpSurface} exposes an HTTP surface but no request body size limit is read from an environment variable (expected MCP_MAX_BODY_BYTES or equivalent)` };
    }
    return { rule, result: 'passed', message: `SEC-RL-02: body size limit configured from the environment in ${scan.bodyLimitEnv}` };
  }

  /** One pass over the workspace sources, collecting every signal both rules need. */
  private async scanSources(satellitePath: string): Promise<SourceScan> {
    const srcPath = path.join(satellitePath, 'src');
    if (!await this.fs.exists(srcPath)) return {};

    const files = (await getAllFilesRecursive(this.fs, srcPath))
      .filter(file => SOURCE_FILE.test(file) && !NOT_SOURCE.test(file));

    const scan: SourceScan = {};
    for (const file of files) {
      const content = await this.fs.readFile(file);
      if (!scan.httpSurface && HTTP_SURFACE.test(content)) scan.httpSurface = file;
      if (!scan.rateLimitEnv && RATE_LIMIT_ENV.test(content)) scan.rateLimitEnv = file;
      if (!scan.bodyLimitEnv && BODY_LIMIT_ENV.test(content)) scan.bodyLimitEnv = file;
      if (scan.httpSurface && scan.rateLimitEnv && scan.bodyLimitEnv) break;
    }
    return scan;
  }
}
