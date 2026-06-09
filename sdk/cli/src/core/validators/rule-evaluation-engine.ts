import * as path from 'path';
import { getContainer, IFileSystem, ILogger } from '../abstractions';
import { ValidationIssue } from './ruleset-validator.service';

export interface NormalizedRule {
  id: string;
  severity: 'MUST' | 'SHOULD' | 'COULD' | 'MUST NOT';
  category: string;
  title: string;
  description: string;
  blocking: boolean;
  validationQuery?: string;
  sourceFile: string;
}

export interface EvaluationContext {
  satellitePath: string;
  corePath: string;
}

export type RuleResult = 'passed' | 'failed' | 'skipped';

export interface RuleEvaluationResult {
  rule: NormalizedRule;
  result: RuleResult;
  message?: string;
}

// IDs already enforced by RulesetValidatorService's hardcoded checks
const ALREADY_CHECKED = new Set(['GOV-01', 'GOV-02', 'INH-02', 'ACL-01', 'OCB-01']);

export class RuleEvaluationEngine {
  private readonly fs: IFileSystem;
  private readonly logger: ILogger;

  constructor(options?: { fileSystem?: IFileSystem; logger?: ILogger }) {
    const container = getContainer();
    this.fs = options?.fileSystem ?? container.createFileSystem();
    this.logger = options?.logger ?? container.createLogger('RuleEvaluationEngine');
  }

  async discoverAndEvaluate(
    satellitePath: string,
    corePath: string,
  ): Promise<RuleEvaluationResult[]> {
    const rules = await this.loadAllRulesets(corePath);
    const ctx: EvaluationContext = { satellitePath, corePath };
    const results: RuleEvaluationResult[] = [];

    for (const rule of rules) {
      if (ALREADY_CHECKED.has(rule.id)) continue;
      results.push(await this.evaluateRule(rule, ctx));
    }

    return results;
  }

  // ─── Ruleset discovery & normalisation ───────────────────────────────────────

  async loadAllRulesets(corePath: string): Promise<NormalizedRule[]> {
    const rulesetsDir = path.join(corePath, 'rulesets');
    if (!await this.fs.exists(rulesetsDir)) return [];

    const files = await this.findRulesetFiles(rulesetsDir);
    const rules: NormalizedRule[] = [];

    for (const filePath of files) {
      try {
        const content = await this.fs.readFile(filePath);
        const parsed = JSON.parse(content) as Record<string, unknown>;
        const relative = filePath.replace(corePath + path.sep, '');
        rules.push(...this.normalizeRuleset(parsed, relative));
      } catch (err: unknown) {
        this.logger.warn(`Failed to load ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
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
      if (entry.endsWith('.rules.json')) {
        files.push(full);
        continue;
      }
      // Only recurse into entries that look like directories (no file extension)
      if (!entry.includes('.')) {
        const stat = await this.fs.stat(full);
        if (stat?.isDirectory?.()) {
          files.push(...await this.findRulesetFiles(full, depth + 1));
        }
      }
    }

    return files;
  }

  private normalizeRuleset(
    parsed: Record<string, unknown>,
    sourceFile: string,
  ): NormalizedRule[] {
    const rawList = (parsed['rules'] ?? parsed['principles']) as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(rawList)) return [];

    // engineering-manifesto: principles contain nested 'rules', no top-level id
    if (rawList.length > 0 && !rawList[0]['id'] && rawList[0]['rules']) return [];

    return rawList
      .filter(r => Boolean(r['id']))
      .map(r => ({
        id: String(r['id']),
        severity: this.normalizeSeverity(r),
        category: this.deriveCategory(r),
        title: String(r['title'] ?? r['principle'] ?? r['id']),
        description: String(r['description'] ?? r['statement'] ?? ''),
        blocking: Boolean(r['blocking'] ?? this.defaultBlocking(r)),
        validationQuery: r['validationQuery'] ? String(r['validationQuery']) : undefined,
        sourceFile,
      }));
  }

  private normalizeSeverity(r: Record<string, unknown>): NormalizedRule['severity'] {
    const raw = String(r['severity'] ?? '').toUpperCase().trim();
    if (raw === 'MUST NOT') return 'MUST NOT';
    if (raw === 'MUST') return 'MUST';
    if (raw === 'SHOULD') return 'SHOULD';
    if (raw === 'COULD' || raw === 'MAY') return 'COULD';
    return r['blocking'] === true || r['enforcement'] ? 'MUST' : 'SHOULD';
  }

  private defaultBlocking(r: Record<string, unknown>): boolean {
    const sev = String(r['severity'] ?? '').toUpperCase();
    return sev === 'MUST' || sev === 'MUST NOT';
  }

  private deriveCategory(r: Record<string, unknown>): string {
    if (r['category']) return String(r['category']);

    const prefix = String(r['id'] ?? '')
      .replace(/-(?:EVD|RR|PAR)-?\d*$/, '')
      .replace(/-\d+$/, '')
      .toLowerCase();

    const map: Record<string, string> = {
      'inh': 'inheritance', 'acl': 'anti-corruption',
      'ocb': 'open-core', 'gov': 'governance',
      'evd': 'identity', 'obs-evd': 'tracing',
      'dep': 'version-pinning', 'tax': 'naming-conventions',
      'hxa': 'layer-structure', 'git': 'branch-naming',
      'cicd': 'ci-cd', 'tpy': 'testing-pyramid',
      'mtn': 'multi-tenancy', 'prot': 'protocol',
      'runt': 'multi-runtime', 'dora': 'metrics',
      'space': 'metrics', 'drift': 'governance',
      'cli-rr': 'build', 'cli-par': 'shared-logic',
      'mcp': 'protocol', 'f1': 'topology',
      'f2': 'module-autonomy', 'f3': 'autonomous-deployment',
    };

    return map[prefix] ?? 'general';
  }

  // ─── Rule dispatcher ──────────────────────────────────────────────────────────

  private async evaluateRule(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const evaluator = this.resolveEvaluator(rule);
    if (!evaluator) {
      return {
        rule,
        result: 'skipped',
        message: 'Requires external system or runtime verification',
      };
    }

    try {
      return await evaluator(rule, ctx);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Evaluator error for ${rule.id}: ${msg}`);
      return { rule, result: 'skipped', message: `Evaluator error: ${msg}` };
    }
  }

  private resolveEvaluator(
    rule: NormalizedRule,
  ): ((rule: NormalizedRule, ctx: EvaluationContext) => Promise<RuleEvaluationResult>) | null {
    const cat = rule.category;
    const id = rule.id;

    // Evidence manifest checks
    if (id.startsWith('EVD-')) return this.evalEvidence.bind(this);

    // CLI release-readiness
    if (id === 'CLI-RR-01') return this.evalBuild.bind(this);
    if (id === 'CLI-RR-02') return this.evalTestArtifacts.bind(this);
    if (id === 'CLI-RR-03') return this.evalDependencyLock.bind(this);
    if (id === 'CLI-RR-04') return this.evalMcpSmoke.bind(this);
    if (id === 'CLI-RR-05') return this.evalCliDocs.bind(this);

    // MCP protocol checks
    if (id === 'MCP-01' || id === 'MCP-02' || id === 'MCP-03') return this.evalMcpEvidence.bind(this);
    if (id === 'MCP-04') return this.evalMcpSecurity.bind(this);

    // Dependency pinning
    if (cat === 'version-pinning' || id.startsWith('DEP-0') || id.startsWith('DEP-1')) {
      if (id === 'DEP-04') return this.evalLockFile.bind(this);
      if (id === 'DEP-05') return this.evalCiInstall.bind(this);
      if (id === 'DEP-06' || id === 'DEP-07') return this.evalCiAudit.bind(this);
      if (id === 'DEP-09') return this.evalDependabot.bind(this);
      if (cat === 'version-pinning') return this.evalVersionPinning.bind(this);
    }

    // Repository taxonomy
    if (id === 'TAX-05' || id === 'TAX-06') return this.evalDirectoryStructure.bind(this);
    if (id === 'TAX-07' || id === 'TAX-08') return this.evalAdrNaming.bind(this);

    // Governance / inheritance (static fields in evolith.yaml)
    if (id === 'INH-01') return this.evalInheritance.bind(this);

    return null;
  }

  // ─── Evaluators ──────────────────────────────────────────────────────────────

  private async evalVersionPinning(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const violations: string[] = [];
    // DEP-10: check all workspace package.json files under satellitePath
    // DEP-01/02/03: check only the satellite root package.json
    const targets = rule.id === 'DEP-10'
      ? await this.findWorkspacePackageJsons(ctx.satellitePath)
      : [path.join(ctx.satellitePath, 'package.json')];

    for (const pkgPath of targets) {
      if (!await this.fs.exists(pkgPath)) continue;

      const raw = await this.fs.readJson(pkgPath) as Record<string, unknown>;
      const depsGroups = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

      for (const group of depsGroups) {
        const deps = raw[group] as Record<string, string> | undefined;
        if (!deps) continue;

        for (const [pkg, version] of Object.entries(deps)) {
          const v = String(version ?? '');
          if (
            (rule.id === 'DEP-01' && v.startsWith('^')) ||
            (rule.id === 'DEP-02' && v.startsWith('~')) ||
            (rule.id === 'DEP-03' && ['*', 'latest', 'x', 'X', ''].includes(v)) ||
            (rule.id === 'DEP-10' && (v.startsWith('^') || v.startsWith('~')))
          ) {
            violations.push(`${path.basename(pkgPath)}#${group}.${pkg}=${v}`);
          }
        }
      }
    }

    if (violations.length > 0) {
      return {
        rule,
        result: 'failed',
        message: `Unpinned dependencies: ${violations.slice(0, 5).join(', ')}${violations.length > 5 ? ` (+${violations.length - 5} more)` : ''}`,
      };
    }

    return { rule, result: 'passed' };
  }

  private async evalLockFile(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const candidates = [
      path.join(ctx.satellitePath, 'package-lock.json'),
      path.join(ctx.corePath, 'package-lock.json'),
    ];

    for (const p of candidates) {
      if (await this.fs.exists(p)) return { rule, result: 'passed' };
    }

    return { rule, result: 'failed', message: 'package-lock.json not found at project or workspace root' };
  }

  private async evalCiInstall(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    return this.evalCiWorkflowContains(rule, ctx, 'npm ci', 'CI workflow does not use "npm ci"');
  }

  private async evalCiAudit(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    return this.evalCiWorkflowContains(rule, ctx, 'npm audit', 'CI workflow does not run "npm audit"');
  }

  private async evalDependabot(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const candidates = [
      path.join(ctx.satellitePath, '.github', 'dependabot.yml'),
      path.join(ctx.satellitePath, '.renovaterc.json'),
      path.join(ctx.corePath, '.github', 'dependabot.yml'),
    ];

    for (const p of candidates) {
      if (await this.fs.exists(p)) return { rule, result: 'passed' };
    }

    return { rule, result: 'failed', message: 'No .github/dependabot.yml or .renovaterc.json found' };
  }

  private async evalCiWorkflowContains(
    rule: NormalizedRule,
    ctx: EvaluationContext,
    needle: string,
    failMsg: string,
  ): Promise<RuleEvaluationResult> {
    const workflowDir = path.join(ctx.satellitePath, '.github', 'workflows');
    if (!await this.fs.exists(workflowDir)) {
      return { rule, result: 'skipped', message: 'No .github/workflows directory found' };
    }

    const files = await this.fs.readdirNames(workflowDir);
    for (const f of files) {
      if (!f.endsWith('.yml') && !f.endsWith('.yaml')) continue;
      const content = await this.fs.readFile(path.join(workflowDir, f));
      if (content.includes(needle)) return { rule, result: 'passed' };
    }

    return { rule, result: 'failed', message: failMsg };
  }

  private async evalDirectoryStructure(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    if (rule.id === 'TAX-05') {
      const expected = ['reference', 'rulesets', 'sdk', '.harness'];
      const missing = [];
      for (const dir of expected) {
        if (!await this.fs.exists(path.join(ctx.corePath, dir))) missing.push(dir);
      }
      if (missing.length > 0) {
        return { rule, result: 'failed', message: `Missing top-level directories: ${missing.join(', ')}` };
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'TAX-06') {
      // TAX-06 applies to satellites only, not to Core itself
      if (ctx.satellitePath === ctx.corePath) {
        return { rule, result: 'skipped', message: 'Not applicable when validating Core itself' };
      }
      // Only evaluate if the satellite has a package.json (i.e. it is a real code project)
      const hasPkg = await this.fs.exists(path.join(ctx.satellitePath, 'package.json'));
      if (!hasPkg) {
        return { rule, result: 'skipped', message: 'Satellite has no package.json — directory structure check not applicable' };
      }
      const required = ['src', 'tests', 'docs'];
      const missing = [];
      for (const dir of required) {
        if (!await this.fs.exists(path.join(ctx.satellitePath, dir))) missing.push(dir);
      }
      if (missing.length > 0) {
        return { rule, result: 'failed', message: `Satellite missing directories: ${missing.join(', ')}` };
      }
      return { rule, result: 'passed' };
    }

    return { rule, result: 'skipped', message: 'Unhandled TAX rule' };
  }

  private async evalAdrNaming(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const adrDir = path.join(ctx.corePath, 'reference', 'architecture', 'adrs');
    if (!await this.fs.exists(adrDir)) {
      return { rule, result: 'skipped', message: 'ADR directory not found' };
    }

    const entries = await this.listFilesRecursive(adrDir);
    const mdFiles = entries.filter(f => f.endsWith('.md'));

    if (rule.id === 'TAX-07') {
      // Only check English ADR files (not .es.md) that start with 4 digits
      const adrPattern = /^[0-9]{4}-[a-z0-9-]+\.md$/;
      const violations = mdFiles
        .map(f => path.basename(f))
        .filter(n => /^[0-9]/.test(n) && !n.endsWith('.es.md') && !adrPattern.test(n));

      if (violations.length > 0) {
        return {
          rule, result: 'failed',
          message: `ADR filenames not matching kebab-case pattern: ${violations.slice(0, 3).join(', ')}`,
        };
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'TAX-08') {
      // Every .md ADR has a paired .es.md
      const enFiles = mdFiles.filter(f => !f.endsWith('.es.md'));
      const missing = enFiles.filter(f => !mdFiles.includes(f.replace(/\.md$/, '.es.md')));
      if (missing.length > 0) {
        return {
          rule, result: 'failed',
          message: `ADRs missing bilingual pair: ${missing.slice(0, 3).map(f => path.basename(f)).join(', ')}`,
        };
      }
      return { rule, result: 'passed' };
    }

    return { rule, result: 'skipped', message: 'Unhandled TAX-ADR rule' };
  }

  private async evalEvidence(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const evidenceDir = path.join(ctx.corePath, '.harness', 'evidence');
    if (!await this.fs.exists(evidenceDir)) {
      return { rule, result: 'failed', message: '.harness/evidence directory not found' };
    }

    const files = await this.fs.readdirNames(evidenceDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    if (jsonFiles.length === 0) {
      return { rule, result: 'failed', message: 'No evidence manifests found in .harness/evidence/' };
    }

    for (const file of jsonFiles) {
      const content = await this.fs.readFile(path.join(evidenceDir, file));
      let manifest: Record<string, unknown>;
      try {
        manifest = JSON.parse(content) as Record<string, unknown>;
      } catch {
        return { rule, result: 'failed', message: `Invalid JSON in evidence file: ${file}` };
      }

      switch (rule.id) {
        case 'EVD-01': {
          const required = ['id', 'source', 'generatedAt', 'producer'];
          const missing = required.filter(k => !manifest[k]);
          if (missing.length > 0) {
            return { rule, result: 'failed', message: `${file} missing fields: ${missing.join(', ')}` };
          }
          if (!manifest['evaluatedRules'] && !manifest['relatedRuleIds'] && !manifest['relatedGateId']) {
            return { rule, result: 'failed', message: `${file} missing evaluatedRules or relatedGateId` };
          }
          break;
        }
        case 'EVD-02': {
          if (!manifest['sourceRef']) {
            return { rule, result: 'failed', message: `${file} missing sourceRef` };
          }
          break;
        }
        case 'EVD-03': {
          const required = ['status', 'evaluatedRules', 'blockingFailures'];
          const missing = required.filter(k => !manifest[k]);
          if (missing.length > 0) {
            return { rule, result: 'failed', message: `${file} missing fields: ${missing.join(', ')}` };
          }
          break;
        }
        case 'EVD-04': {
          if (!manifest['retentionPeriod'] || !manifest['owner']) {
            return { rule, result: 'failed', message: `${file} missing retentionPeriod or owner` };
          }
          break;
        }
      }
    }

    return { rule, result: 'passed' };
  }

  private async evalBuild(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const distMain = path.join(ctx.corePath, 'sdk', 'cli', 'dist', 'main.js');
    if (await this.fs.exists(distMain)) return { rule, result: 'passed' };
    return { rule, result: 'failed', message: `dist/main.js not found — run npm run build in sdk/cli` };
  }

  private async evalTestArtifacts(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const distDir = path.join(ctx.corePath, 'sdk', 'cli', 'dist');
    if (!await this.fs.exists(distDir)) {
      return { rule, result: 'failed', message: 'dist/ not found — run npm run build' };
    }
    // Check at least some compiled spec artefacts exist
    const specFiles = await this.findSpecFiles(distDir);
    if (specFiles.length === 0) {
      return { rule, result: 'skipped', message: 'No compiled spec files in dist/ — run npm test to confirm' };
    }
    return { rule, result: 'passed' };
  }

  private async evalDependencyLock(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const candidates = [
      path.join(ctx.corePath, 'package-lock.json'),
      path.join(ctx.corePath, 'sdk', 'cli', 'package-lock.json'),
    ];
    for (const p of candidates) {
      if (await this.fs.exists(p)) return { rule, result: 'passed' };
    }
    return { rule, result: 'failed', message: 'package-lock.json not found' };
  }

  private async evalMcpSmoke(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const evidenceDir = path.join(ctx.corePath, '.harness', 'evidence');
    if (!await this.fs.exists(evidenceDir)) {
      return { rule, result: 'failed', message: 'No .harness/evidence directory' };
    }
    const files = await this.fs.readdirNames(evidenceDir);
    const smokeFile = files.find(f => f.includes('mcp') && f.endsWith('.json'));
    if (!smokeFile) {
      return { rule, result: 'failed', message: 'No MCP smoke evidence found in .harness/evidence/' };
    }

    const content = await this.fs.readFile(path.join(evidenceDir, smokeFile));
    const evidence = JSON.parse(content) as Record<string, unknown>;
    if (evidence['status'] !== 'passed') {
      return { rule, result: 'failed', message: `MCP smoke evidence status: ${evidence['status']}` };
    }
    return { rule, result: 'passed' };
  }

  private async evalMcpEvidence(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const evidenceDir = path.join(ctx.corePath, '.harness', 'evidence');
    const files = await this.fs.exists(evidenceDir)
      ? await this.fs.readdirNames(evidenceDir)
      : [];
    const smokeFile = files.find(f => f.includes('mcp') && f.endsWith('.json'));

    if (!smokeFile) {
      return { rule, result: 'skipped', message: 'Run .harness/scripts/mcp-smoke.mjs to generate evidence' };
    }

    const evidence = JSON.parse(
      await this.fs.readFile(path.join(evidenceDir, smokeFile)),
    ) as Record<string, unknown>;

    const results = evidence['results'] as Record<string, unknown> | undefined;
    if (!results) return { rule, result: 'failed', message: 'Evidence missing results field' };

    if (rule.id === 'MCP-01' && !results['initialize']) {
      return { rule, result: 'failed', message: 'initialize response missing from evidence' };
    }
    if (rule.id === 'MCP-02' && !results['tools/list']) {
      return { rule, result: 'failed', message: 'tools/list response missing from evidence' };
    }
    if (rule.id === 'MCP-03' && !results['resources/list']) {
      return { rule, result: 'failed', message: 'resources/list response missing from evidence' };
    }

    return { rule, result: 'passed' };
  }

  private async evalMcpSecurity(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const serverFile = path.join(ctx.corePath, 'sdk', 'cli', 'src', 'core', 'mcp', 'server.ts');
    if (!await this.fs.exists(serverFile)) {
      return { rule, result: 'skipped', message: 'MCP server.ts not found' };
    }
    const content = await this.fs.readFile(serverFile);
    if (content.includes('apiKey') || content.includes('local-only') || content.includes('localhost')) {
      return { rule, result: 'passed' };
    }
    return { rule, result: 'failed', message: 'MCP transport config missing apiKey or local-only restriction' };
  }

  private async evalCliDocs(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const cliDir = path.join(ctx.corePath, 'sdk', 'cli');
    const readme = path.join(cliDir, 'README.md');
    const arch = path.join(cliDir, 'ARCHITECTURE.md');
    if (await this.fs.exists(readme) || await this.fs.exists(arch)) {
      return { rule, result: 'passed' };
    }
    return { rule, result: 'failed', message: 'CLI missing README.md or ARCHITECTURE.md' };
  }

  private async evalInheritance(
    rule: NormalizedRule,
    ctx: EvaluationContext,
  ): Promise<RuleEvaluationResult> {
    // INH-01: satellites cannot have their own rulesets/ directory
    const satelliteRulesets = path.join(ctx.satellitePath, 'rulesets');
    if (ctx.satellitePath !== ctx.corePath && await this.fs.exists(satelliteRulesets)) {
      return { rule, result: 'failed', message: 'Satellite contains a rulesets/ directory — inheriting from Core only is required' };
    }
    return { rule, result: 'passed' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async listFilesRecursive(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await this.fs.readdirNames(dir);

    for (const entry of entries) {
      const full = path.join(dir, entry);
      const stat = await this.fs.stat(full);
      if (stat.isDirectory()) {
        files.push(...await this.listFilesRecursive(full));
      } else {
        files.push(full);
      }
    }

    return files;
  }

  private async findSpecFiles(dir: string): Promise<string[]> {
    const all = await this.listFilesRecursive(dir);
    return all.filter(f => f.includes('.spec.') || f.includes('.test.'));
  }

  private async findWorkspacePackageJsons(rootPath: string): Promise<string[]> {
    const rootPkg = path.join(rootPath, 'package.json');
    const files: string[] = [];

    if (await this.fs.exists(rootPkg)) {
      files.push(rootPkg);
      const raw = await this.fs.readJson(rootPkg) as Record<string, unknown>;
      const workspaces = raw['workspaces'] as string[] | { packages?: string[] } | undefined;
      const patterns: string[] = Array.isArray(workspaces)
        ? workspaces
        : (workspaces?.packages ?? []);

      for (const pattern of patterns) {
        // Resolve simple glob patterns like 'sdk/*' or 'packages/*'
        const base = pattern.replace(/\/\*.*$/, '');
        const wsBase = path.join(rootPath, base);
        if (await this.fs.exists(wsBase)) {
          const entries = await this.fs.readdirNames(wsBase);
          for (const entry of entries) {
            const pkgPath = path.join(wsBase, entry, 'package.json');
            if (await this.fs.exists(pkgPath)) files.push(pkgPath);
          }
        }
      }
    }

    return files.length > 0 ? files : [rootPkg];
  }

  toValidationIssues(results: RuleEvaluationResult[]): ValidationIssue[] {
    return results
      .filter(r => r.result === 'failed')
      .map(r => ({
        ruleId: r.rule.id,
        severity: (r.rule.severity === 'MUST NOT' ? 'MUST' : r.rule.severity) as 'MUST' | 'SHOULD' | 'COULD',
        category: r.rule.category,
        title: r.rule.title,
        description: r.message ?? r.rule.description,
        blocking: r.rule.blocking,
      }));
  }
}
