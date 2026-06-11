import * as path from 'path';
import { getContainer, IFileSystem, ILogger } from '../abstractions';
import { ValidationIssue } from './ruleset-validator.service';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { IRuleEvaluatorStrategy, EvaluationContext, RuleEvaluationResult } from './evaluators/evaluator.interface';
import { NativeEvaluator } from './evaluators/native-evaluator';

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

export type RuleResult = 'passed' | 'failed' | 'skipped';

// IDs already enforced by RulesetValidatorService's hardcoded checks
const ALREADY_CHECKED = new Set(['GOV-01', 'GOV-02', 'INH-02', 'ACL-01', 'OCB-01']);

export class RuleEvaluationEngine {
  private readonly fs: IFileSystem;
  private readonly logger: ILogger;
  private readonly ajv: Ajv;
  private validateSchema: any;
  private readonly strategy: IRuleEvaluatorStrategy;

  constructor(options?: { fileSystem?: IFileSystem; logger?: ILogger, strategy?: IRuleEvaluatorStrategy }) {
    const container = getContainer();
    this.fs = options?.fileSystem ?? container.createFileSystem();
    this.logger = options?.logger ?? container.createLogger('RuleEvaluationEngine');
    this.strategy = options?.strategy ?? new NativeEvaluator(this.fs, this.logger);
    
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
  }

  async discoverAndEvaluate(
    satellitePath: string,
    corePath: string,
  ): Promise<RuleEvaluationResult[]> {
    const rules = await this.loadAllRulesets(corePath);
    const ctx: EvaluationContext = { satellitePath, corePath };
    const results: RuleEvaluationResult[] = [];
    
    const rulesToEval = rules.filter(rule => !ALREADY_CHECKED.has(rule.id));
    results.push(...await this.strategy.evaluateAll(rulesToEval, ctx));

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
        
        // Exclude SDLC gate rulesets from standard validation here since PhaseGateValidator handles them
        if (!filePath.endsWith('phase-gates.rules.json')) {
          if (!this.validateSchema) {
            const schemaPath = path.join(rulesetsDir, 'schema', 'ruleset-standard.schema.json');
            const schemaContent = await this.fs.readFile(schemaPath);
            this.validateSchema = this.ajv.compile(JSON.parse(schemaContent));
          }
          const valid = this.validateSchema(parsed);
          if (!valid) {
             throw new Error(`Schema validation failed: ${this.ajv.errorsText(this.validateSchema.errors)}`);
          }
        }

        const relative = filePath.replace(corePath + path.sep, '');
        rules.push(...this.normalizeRuleset(parsed, relative));
      } catch (err: unknown) {
        // As requested by user: throw error for malformed rulesets instead of just warning
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Malformed ruleset detected at ${filePath}: ${message}`);
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
