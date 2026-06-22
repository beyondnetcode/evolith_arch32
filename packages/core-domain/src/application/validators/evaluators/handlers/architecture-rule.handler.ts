const ts: any = require('typescript');
import * as path from 'path';
import { IFileSystem } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { EvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

export class ArchitectureRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem) {}

  canHandle(rule: NormalizedRule): boolean {
    return Boolean(rule.category) && [
      'topology', 'bounded-contexts', 'hexagonal-architecture', 
      'communication', 'persistence', 'async-boundaries', 
      'extraction-readiness', 'observability', 'module-autonomy', 
      'contract-stability', 'data-ownership', 'async-communication', 
      'distributed-tracing', 'containerization', 'service-boundaries',
      'separation-of-concerns', 'dependency-injection', 'static-analysis',
      'domain-purity', 'agent-identity', 'agent-sandbox',
      'agent-prompt-boundaries', 'agent-tool-approval', 'agent-sandbox-limits',
      'agent-context-trust', 'agent-action-accountability', 'agent-operational-budgets', 'agent-credential-lifecycle',
      'serverless-config', 'serverless-stateless', 'serverless-package', 'serverless-cold-start',
      'event-driven-config', 'event-driven-outbox', 'event-driven-dlq',
      'data-mesh-config', 'data-mesh-contracts', 'data-mesh-governance',
      'edge-computing-sync', 'edge-computing-isolation', 'edge-computing-conflict'
    ].includes(rule.category);
  }

  async evaluate(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    const satellitePath = ctx.satellitePath;
    let message: string | undefined;
    let result: 'passed' | 'failed' | 'skipped' = 'passed';

    switch (rule.category) {
      case 'agent-identity': {
        const config = await this.readAgentConfig(satellitePath);
        const agent = this.asRecord(config?.agent);
        if (typeof agent?.id !== 'string' || agent.id.length === 0 || this.asStringArray(agent.capabilities).length === 0) {
          result = 'failed';
          message = `${rule.description} - Expected agent.config.json with agent.id and one or more capabilities`;
        }
        break;
      }

      case 'agent-sandbox': {
        const config = await this.readAgentConfig(satellitePath);
        const sandbox = this.asRecord(config?.sandbox);
        if (sandbox?.mode !== 'isolated' || !this.isRestrictedAccess(sandbox.network) || !this.isRestrictedAccess(sandbox.process)) {
          result = 'failed';
          message = `${rule.description} - Expected sandbox.mode=isolated and deny or allowlist network and process access`;
        }
        break;
      }

      case 'agent-prompt-boundaries': {
        const config = await this.readAgentConfig(satellitePath);
        const promptSources = this.asStringArray(config?.promptSources);
        const implementationRoots = this.asStringArray(config?.implementationRoots);
        if (promptSources.length === 0 || implementationRoots.length === 0 || this.pathsOverlap(promptSources, implementationRoots)) {
          result = 'failed';
          message = `${rule.description} - Expected non-overlapping promptSources and implementationRoots in agent.config.json`;
        }
        break;
      }

      case 'agent-tool-approval': {
        const config = await this.readAgentConfig(satellitePath);
        const toolPolicy = this.asRecord(config?.toolPolicy);
        if (toolPolicy?.mutative !== 'approval-required') {
          result = 'failed';
          message = `${rule.description} - Expected toolPolicy.mutative=approval-required in agent.config.json`;
        }
        break;
      }

      case 'agent-sandbox-limits': {
        const config = await this.readAgentConfig(satellitePath);
        const sandbox = this.asRecord(config?.sandbox);
        if (sandbox?.ephemeral !== true || !this.isPositiveNumber(sandbox.maxDurationSeconds) || !this.isPositiveNumber(sandbox.maxMemoryMb) || !this.isPositiveNumber(sandbox.maxCpuCores)) {
          result = 'failed';
          message = `${rule.description} - Expected ephemeral sandbox with positive duration, memory, and CPU limits`;
        }
        break;
      }

      case 'agent-context-trust': {
        const config = await this.readAgentConfig(satellitePath);
        const contextPolicy = this.asRecord(config?.contextPolicy);
        if (contextPolicy?.untrustedContent !== 'data-only' || contextPolicy?.provenanceRequired !== true || contextPolicy?.toolOutputSchemaValidation !== true) {
          result = 'failed';
          message = `${rule.description} - Expected data-only untrusted context, provenance, and tool-output schema validation`;
        }
        break;
      }

      case 'agent-action-accountability': {
        const config = await this.readAgentConfig(satellitePath);
        const toolPolicy = this.asRecord(config?.toolPolicy);
        const audit = this.asRecord(config?.audit);
        if (toolPolicy?.capabilityDelegation !== 'scoped-and-expiring' || audit?.appendOnly !== true || audit?.correlationId !== 'required') {
          result = 'failed';
          message = `${rule.description} - Expected scoped-and-expiring capabilities plus append-only correlated action evidence`;
        }
        break;
      }

      case 'agent-operational-budgets': {
        const config = await this.readAgentConfig(satellitePath);
        const budgets = this.asRecord(config?.operationalBudgets);
        const concurrency = this.asRecord(budgets?.mcpToolConcurrency);
        const runbooksPath = typeof budgets?.runbooksPath === 'string' ? budgets.runbooksPath : '';
        const runbooksAbsolute = runbooksPath.length > 0 ? (path.isAbsolute(runbooksPath) ? runbooksPath : path.join(satellitePath, runbooksPath)) : '';
        const runbooksExists = runbooksAbsolute.length > 0 && await this.fs.exists(runbooksAbsolute);
        if (!this.isPositiveNumber(budgets?.maxPromptTokens)
          || !this.isPositiveNumber(budgets?.maxCompletionTokens)
          || !this.isPositiveNumber(budgets?.maxContextWindowTokens)
          || !this.isPositiveNumber(concurrency?.maxInFlight)
          || !this.isPositiveNumber(concurrency?.perToolMaxInFlight)
          || !runbooksExists) {
          result = 'failed';
          message = `${rule.description} - Expected positive token, context, and MCP concurrency budgets plus a runbooksPath that exists`;
        }
        break;
      }

      case 'agent-credential-lifecycle': {
        const config = await this.readAgentConfig(satellitePath);
        const credentials = this.asRecord(config?.credentialLifecycle);
        const revocation = this.asRecord(credentials?.revocation);
        if (!this.isPositiveNumber(credentials?.delegationMaxTtlSeconds)
          || !this.isPositiveNumber(credentials?.rotationCadenceDays)
          || (revocation?.onIncident !== 'immediate' && revocation?.onIncident !== 'scheduled')
          || !this.isPositiveNumber(revocation?.maxPropagationSeconds)) {
          result = 'failed';
          message = `${rule.description} - Expected positive delegation TTL, rotation cadence, and bounded incident revocation`;
        }
        break;
      }

      case 'topology':
        if (rule.id === 'MM-R01') {
          const packageJsonPath = path.join(satellitePath, 'package.json');
          if (await this.fs.exists(packageJsonPath)) {
            const pkg = await this.fs.readJson(packageJsonPath) as { workspaces?: unknown };
            if (pkg.workspaces) {
              result = 'failed';
              message = `${rule.description} - Monorepo workspace detected`;
            }
          }
        }
        break;

      case 'bounded-contexts':
        if (rule.id === 'MM-R02') {
          const srcPath = path.join(satellitePath, 'src');
          if (await this.fs.exists(srcPath)) {
            const entries = await this.fs.readdirNames(srcPath);
            const moduleCount = entries.filter(e => !e.startsWith('.')).length;
            if (moduleCount < 2) {
              result = 'failed';
              message = `${rule.description} - Found only ${moduleCount} module(s) in src/`;
            }
          }
        }
        break;

      case 'hexagonal-architecture':
        if (rule.id === 'MM-R03') {
          const srcPath = path.join(satellitePath, 'src');
          const hasPorts = await this.fs.exists(path.join(srcPath, 'ports')) ||
                           await this.fs.exists(path.join(srcPath, 'Ports')) ||
                           await this.fs.exists(path.join(srcPath, 'application/ports'));
          if (!hasPorts) {
            result = 'failed';
            message = `${rule.description} - No ports directory found (expected: src/ports or src/application/ports)`;
          }
        }
        break;

      case 'communication':
        if (rule.id === 'MM-R04' || rule.id === 'DM-R03') {
          const contractsPath = path.join(satellitePath, 'contracts');
          if (!await this.fs.exists(contractsPath)) {
            result = 'failed';
            message = `${rule.description} - No contracts/ directory found for inter-module contracts`;
          }
        }
        break;

      case 'persistence':
        if (rule.id === 'MM-R05') {
          const aclPath = path.join(satellitePath, 'acl');
          if (!await this.fs.exists(aclPath)) {
            result = 'failed';
            message = `${rule.description} - No acl/ directory found (should contain one subdirectory per bounded context)`;
          } else {
            const entries = await this.fs.readdirNames(aclPath);
            if (entries.length < 2) {
              result = 'failed';
              message = `${rule.description} - Found ${entries.length} bounded context(s) in acl/ (expected multiple)`;
            }
          }
        }
        break;

      case 'async-boundaries':
        if (rule.id === 'MM-R06') {
          const eventsPath = path.join(satellitePath, 'events') ||
                             path.join(satellitePath, 'src', 'events') ||
                             path.join(satellitePath, 'src', 'domain', 'events');
          if (!await this.fs.exists(eventsPath)) {
            result = 'failed';
            message = `${rule.description} - No events directory found`;
          }
        }
        break;

      case 'extraction-readiness':
        if (rule.id === 'MM-R07') {
          const extractionReadinessPath = path.join(satellitePath, 'docs', 'extraction-readiness.md');
          if (!await this.fs.exists(extractionReadinessPath)) {
            result = 'failed';
            message = `${rule.description} - No extraction-readiness.md found in docs/`;
          }
        }
        break;

      case 'observability':
        if (rule.id === 'MM-R08') {
          if (await this.fs.exists(path.join(satellitePath, 'package.json'))) {
            const otelConfigPath = path.join(satellitePath, 'otel.config.js') ||
                                  path.join(satellitePath, 'opentelemetry.config.js') ||
                                  path.join(satellitePath, 'src', 'instrumentation.ts');
            let hasOtel = false;
            if (await this.fs.exists(otelConfigPath)) {
              hasOtel = true;
            }
            if (!hasOtel) {
              result = 'failed';
              message = `${rule.description} - No OpenTelemetry instrumentation found`;
            }
          }
        }
        break;

      case 'module-autonomy':
        if (rule.id === 'DM-R01') {
          const srcPath = path.join(satellitePath, 'src');
          if (await this.fs.exists(srcPath)) {
            const entries = await this.fs.readdirNames(srcPath);
            let hasIndependentModules = false;
            for (const entry of entries) {
              if (await this.fs.exists(path.join(srcPath, entry, 'package.json'))) {
                hasIndependentModules = true;
                break;
              }
            }
            if (!hasIndependentModules && entries.length > 1) {
              result = 'failed';
              message = `${rule.description} - No independent module package.json files found`;
            }
          }
        }
        break;

      case 'contract-stability':
        if (rule.id === 'DM-R02') {
          const contractsPath = path.join(satellitePath, 'contracts');
          if (!await this.fs.exists(contractsPath)) {
            result = 'failed';
            message = `${rule.description} - No contracts directory found`;
          } else {
            const contractFiles = (await this.fs.readdirNames(contractsPath)).filter(f =>
              f.endsWith('.proto') || f.endsWith('.avsc') || f.endsWith('.json')
            );
            if (contractFiles.length === 0) {
              result = 'failed';
              message = `${rule.description} - No contract definition files (.proto, .avsc, .json schema) found`;
            }
          }
        }
        break;

      case 'data-ownership':
        if (rule.id === 'DM-R03') {
          const aclPath = path.join(satellitePath, 'acl');
          if (!await this.fs.exists(aclPath)) {
            result = 'failed';
            message = `${rule.description} - No acl directory for data ownership enforcement`;
          }
        }
        break;

      case 'async-communication':
        if (rule.id === 'DM-R04') {
          const eventsPath = path.join(satellitePath, 'events') || path.join(satellitePath, 'src', 'events');
          if (await this.fs.exists(eventsPath)) {
            const eventFiles = (await this.fs.readdirNames(eventsPath)).filter(f => f.endsWith('.json') || f.endsWith('.schema.json'));
            if (eventFiles.length === 0) {
              result = 'failed';
              message = `${rule.description} - No schema-validated event files found`;
            }
          }
        }
        break;

      case 'distributed-tracing':
        {
          const tracerSetupFiles = [
            path.join(satellitePath, 'src', 'tracing.ts'),
            path.join(satellitePath, 'src', 'instrumentation.ts'),
            path.join(satellitePath, 'opentelemetry.config.js'),
          ];
          const existsResults = await Promise.all(tracerSetupFiles.map(f => this.fs.exists(f)));
          if (!existsResults.some(Boolean)) {
            result = 'failed';
            message = `${rule.description} - No distributed tracing setup found`;
          }
        }
        break;

      case 'containerization':
        if (rule.id === 'MS-R01') {
          const dockerfilePath = path.join(satellitePath, 'Dockerfile');
          if (!await this.fs.exists(dockerfilePath)) {
            result = 'failed';
            message = `${rule.description} - No Dockerfile found at repository root`;
          }
        }
        break;

      case 'service-boundaries':
        if (rule.id === 'MS-R02') {
          const srcPath = path.join(satellitePath, 'src');
          if (await this.fs.exists(srcPath)) {
            const entries = await this.fs.readdirNames(srcPath);
            const dirEntries: string[] = [];
            for (const entry of entries) {
              const entryPath = path.join(srcPath, entry);
              const stat = await this.fs.stat(entryPath);
              if (stat.isDirectory()) {
                dirEntries.push(entry);
              }
            }
            if (dirEntries.length < 2) {
              result = 'failed';
              message = `${rule.description} - Only ${dirEntries.length} service(s) found (expected multiple independent services)`;
            }
          }
        }
        break;

      case 'separation-of-concerns':
        if (rule.id === 'MM-R11') {
          const srcPath = path.join(satellitePath, 'src');
          if (await this.fs.exists(srcPath)) {
            const files = await this.getAllFilesRecursive(srcPath);
            const tsFiles = files.filter(f => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.endsWith('.test.ts'));
            
            for (const file of tsFiles) {
              if (file.includes('/application/') || file.includes('/domain/') || file.includes('/use-cases/')) {
                const content = await this.fs.readFile(file);
                const ts = require('typescript');
                const sourceFile = ts.createSourceFile(
                  file,
                  content,
                  ts.ScriptTarget.Latest,
                  true
                );

                let hasUiImport = false;
                const checkNode = (node: any) => {
                  if (ts.isImportDeclaration(node)) {
                    const importPath = node.moduleSpecifier.getText().replace(/['"]/g, '');
                    if (['@clack/prompts', 'inquirer', 'commander', 'express'].includes(importPath)) {
                      hasUiImport = true;
                    }
                  }
                  ts.forEachChild(node, checkNode);
                };
                checkNode(sourceFile);

                if (hasUiImport) {
                  result = 'failed';
                  message = `${rule.description} - UI/CLI library imported in logic layer file: ${file}`;
                  break;
                }
              }
            }
          }
        }
        break;

      case 'dependency-injection':
        if (rule.id === 'MM-R09') {
          const srcPath = path.join(satellitePath, 'src');
          if (await this.fs.exists(srcPath)) {
            const files = await this.getAllFilesRecursive(srcPath);
            const tsFiles = files.filter(f => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.endsWith('.test.ts') && !f.endsWith('app.module.ts') && !f.endsWith('registry.ts'));
            
            for (const file of tsFiles) {
              const content = await this.fs.readFile(file);
              const ts = require('typescript');
              const sourceFile = ts.createSourceFile(
                file,
                content,
                ts.ScriptTarget.Latest,
                true
              );

              let hasManualInstantiation = false;
              const checkNode = (node: any) => {
                if (ts.isNewExpression(node)) {
                  const className = node.expression.getText();
                  if (/(Service|UseCase|Repository|Adapter)$/.test(className)) {
                    hasManualInstantiation = true;
                  }
                }
                ts.forEachChild(node, checkNode);
              };
              checkNode(sourceFile);

              if (hasManualInstantiation) {
                result = 'failed';
                message = `${rule.description} - Manual instantiation (new keyword) of Service/UseCase/Repository detected in: ${file}`;
                break;
              }
            }
          }
        }
        break;

      case 'static-analysis':
        if (rule.id === 'MM-R10') {
          const srcPath = path.join(satellitePath, 'src');
          if (await this.fs.exists(srcPath)) {
            const files = await this.getAllFilesRecursive(srcPath);
            const analyzerFiles = files.filter(f => f.includes('analyzer') && f.endsWith('.ts') && !f.endsWith('.spec.ts'));
            
            for (const file of analyzerFiles) {
              const content = await this.fs.readFile(file);
              const ts = require('typescript');
              const sourceFile = ts.createSourceFile(
                file,
                content,
                ts.ScriptTarget.Latest,
                true
              );

              let hasAstImport = false;
              let usesRegexForCode = false;

              const checkNode = (node: any) => {
                if (ts.isImportDeclaration(node)) {
                  const importPath = node.moduleSpecifier.getText().replace(/['"]/g, '');
                  if (importPath === 'typescript' || importPath === '@babel/parser') {
                    hasAstImport = true;
                  }
                }
                // Check if the file uses regex for code structure (heuristic: /Regex/ or /match/)
                if (content.includes('RegExp') || content.includes('.match(')) {
                    // Check if they are actually parsing something complex with Regex instead of AST
                    // We assume if it doesn't have AST import but uses Regex, it violates R10
                    usesRegexForCode = true;
                }

                ts.forEachChild(node, checkNode);
              };
              checkNode(sourceFile);

              if (!hasAstImport && usesRegexForCode) {
                result = 'failed';
                message = `${rule.description} - Analyzer file appears to use Regex without an AST parser like typescript: ${file}`;
                break;
              }
            }
          }
        }
        break;

      case 'domain-purity':
        if (rule.id === 'MM-R12') {
          const srcPath = path.join(satellitePath, 'src');
          if (await this.fs.exists(srcPath)) {
            const files = await this.getAllFilesRecursive(srcPath);
            const domainFiles = files.filter(f => f.includes('/domain/') && f.endsWith('.ts') && !f.endsWith('.spec.ts'));
            
            for (const file of domainFiles) {
              const content = await this.fs.readFile(file);
              const ts = require('typescript');
              const sourceFile = ts.createSourceFile(
                file,
                content,
                ts.ScriptTarget.Latest,
                true
              );

              let hasPersistenceImport = false;
              const checkNode = (node: any) => {
                if (ts.isImportDeclaration(node)) {
                  const importPath = node.moduleSpecifier.getText().replace(/['"]/g, '');
                  if (importPath.includes('typeorm') || importPath.includes('mongoose') || importPath.includes('sequelize') || importPath.includes('prisma')) {
                    hasPersistenceImport = true;
                  }
                }
                ts.forEachChild(node, checkNode);
              };
              checkNode(sourceFile);

              if (hasPersistenceImport) {
                // Return failed so the runner logs it, but it's configured as non-blocking in OPA
                result = 'failed';
                message = `[RECOMMENDATION] ${rule.description} - Domain persistence import detected in: ${file}. Consider using Data Mapper.`;
                break;
              }
            }
          }
        }
        break;

      case 'serverless-config':
      case 'serverless-stateless':
      case 'serverless-package':
      case 'serverless-cold-start': {
        const config = await this.readServerlessConfig(satellitePath);
        const pkg = this.asRecord(config?.package);
        const coldStart = this.asRecord(config?.coldStart);
        const valid = rule.category === 'serverless-config' ? Boolean(config)
          : rule.category === 'serverless-stateless' ? config?.stateless === true
          : rule.category === 'serverless-package' ? this.isPositiveNumber(pkg?.maxSizeMb) && (pkg?.maxSizeMb as number) <= 50
          : this.isPositiveNumber(coldStart?.maxInitMilliseconds) && coldStart?.lazyInitialization === true;
        if (!valid) { result = 'failed'; message = `${rule.description} - serverless.config.json does not satisfy ${rule.id}`; }
        break;
      }

      case 'event-driven-config':
      case 'event-driven-outbox':
      case 'event-driven-dlq': {
        const config = await this.readEventDrivenConfig(satellitePath);
        const valid = rule.category === 'event-driven-config' ? config?.strictAsyncApi === true
          : rule.category === 'event-driven-outbox' ? config?.transactionalOutbox === true
          : config?.deadLetterQueue === true;
        if (!valid) { result = 'failed'; message = `${rule.description} - event-driven.config.json does not satisfy ${rule.id}`; }
        break;
      }

      case 'data-mesh-config':
      case 'data-mesh-contracts':
      case 'data-mesh-governance': {
        const config = await this.readDataMeshConfig(satellitePath);
        const valid = rule.category === 'data-mesh-config' ? config?.isDataProduct === true
          : rule.category === 'data-mesh-contracts' ? config?.hasDataContracts === true
          : config?.federatedGovernance === true;
        if (!valid) { result = 'failed'; message = `${rule.description} - data-mesh.config.json does not satisfy ${rule.id}`; }
        break;
      }

      case 'edge-computing-sync':
      case 'edge-computing-isolation':
      case 'edge-computing-conflict': {
        const config = await this.readEdgeComputingConfig(satellitePath);
        const valid = rule.category === 'edge-computing-sync' ? ['offline-first', 'eventual', 'real-time-fallback'].includes(config?.syncStrategy as string)
          : rule.category === 'edge-computing-isolation' ? config?.edgeIsolation === true
          : ['last-write-wins', 'merge', 'manual'].includes(config?.conflictResolution as string);
        if (!valid) { result = 'failed'; message = `${rule.description} - edge-computing.config.json does not satisfy ${rule.id}`; }
        break;
      }

      default:
        result = 'skipped';
        break;
    }

    return { rule, result, message };
  }

  private async readAgentConfig(satellitePath: string): Promise<Record<string, unknown> | undefined> {
    const configPath = path.join(satellitePath, 'agent.config.json');
    if (!await this.fs.exists(configPath)) return undefined;
    const config = await this.fs.readJson(configPath);
    return this.asRecord(config);
  }

  private async readServerlessConfig(satellitePath: string): Promise<Record<string, unknown> | undefined> {
    const configPath = path.join(satellitePath, 'serverless.config.json');
    return await this.fs.exists(configPath) ? this.asRecord(await this.fs.readJson(configPath)) : undefined;
  }

  private async readEventDrivenConfig(satellitePath: string): Promise<Record<string, unknown> | undefined> {
    const configPath = path.join(satellitePath, 'event-driven.config.json');
    return await this.fs.exists(configPath) ? this.asRecord(await this.fs.readJson(configPath)) : undefined;
  }

  private async readDataMeshConfig(satellitePath: string): Promise<Record<string, unknown> | undefined> {
    const configPath = path.join(satellitePath, 'data-mesh.config.json');
    return await this.fs.exists(configPath) ? this.asRecord(await this.fs.readJson(configPath)) : undefined;
  }

  private async readEdgeComputingConfig(satellitePath: string): Promise<Record<string, unknown> | undefined> {
    const configPath = path.join(satellitePath, 'edge-computing.config.json');
    return await this.fs.exists(configPath) ? this.asRecord(await this.fs.readJson(configPath)) : undefined;
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  }

  private asStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
  }

  private isRestrictedAccess(value: unknown): boolean {
    return value === 'deny' || value === 'allowlist';
  }

  private isPositiveNumber(value: unknown): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  }

  private pathsOverlap(left: string[], right: string[]): boolean {
    return left.some(leftPath => right.some(rightPath => {
      const normalizedLeft = leftPath.replace(/\\+|\/+/g, '/').replace(/\/$/, '');
      const normalizedRight = rightPath.replace(/\\+|\/+/g, '/').replace(/\/$/, '');
      return normalizedLeft === normalizedRight || normalizedLeft.startsWith(`${normalizedRight}/`) || normalizedRight.startsWith(`${normalizedLeft}/`);
    }));
  }

  private async getAllFilesRecursive(dir: string): Promise<string[]> {
    const files: string[] = [];
    if (!await this.fs.exists(dir)) return files;
    const entries = await this.fs.readdirNames(dir);
    for (const entry of entries) {
      if (entry === '.' || entry === '..') continue;
      const full = path.join(dir, entry);
      const stat = await this.fs.stat(full);
      if (stat.isDirectory()) {
        files.push(...await this.getAllFilesRecursive(full));
      } else {
        files.push(full);
      }
    }
    return files;
  }
}
