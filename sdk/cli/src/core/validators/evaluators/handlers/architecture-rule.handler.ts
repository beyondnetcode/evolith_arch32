import * as path from 'path';
import { IFileSystem } from '../../../abstractions';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { EvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

export class ArchitectureRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem) {}

  canHandle(rule: NormalizedRule): boolean {
    return rule.category && [
      'topology', 'bounded-contexts', 'hexagonal-architecture', 
      'communication', 'persistence', 'async-boundaries', 
      'extraction-readiness', 'observability', 'module-autonomy', 
      'contract-stability', 'data-ownership', 'async-communication', 
      'distributed-tracing', 'containerization', 'service-boundaries'
    ].includes(rule.category);
  }

  async evaluate(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    const satellitePath = ctx.satellitePath;
    let message: string | undefined;
    let result: 'passed' | 'failed' | 'skipped' = 'passed';

    switch (rule.category) {
      case 'topology':
        if (rule.id === 'F1-R01') {
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
        if (rule.id === 'F1-R02') {
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
        if (rule.id === 'F1-R03') {
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
        if (rule.id === 'F1-R04' || rule.id === 'F2-R03') {
          const contractsPath = path.join(satellitePath, 'contracts');
          if (!await this.fs.exists(contractsPath)) {
            result = 'failed';
            message = `${rule.description} - No contracts/ directory found for inter-module contracts`;
          }
        }
        break;

      case 'persistence':
        if (rule.id === 'F1-R05') {
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
        if (rule.id === 'F1-R06') {
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
        if (rule.id === 'F1-R07') {
          const extractionReadinessPath = path.join(satellitePath, 'docs', 'extraction-readiness.md');
          if (!await this.fs.exists(extractionReadinessPath)) {
            result = 'failed';
            message = `${rule.description} - No extraction-readiness.md found in docs/`;
          }
        }
        break;

      case 'observability':
        if (rule.id === 'F1-R08') {
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
        if (rule.id === 'F2-R01') {
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
        if (rule.id === 'F2-R02') {
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
        if (rule.id === 'F2-R03') {
          const aclPath = path.join(satellitePath, 'acl');
          if (!await this.fs.exists(aclPath)) {
            result = 'failed';
            message = `${rule.description} - No acl directory for data ownership enforcement`;
          }
        }
        break;

      case 'async-communication':
        if (rule.id === 'F2-R04') {
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
        if (rule.id === 'F3-R01') {
          const dockerfilePath = path.join(satellitePath, 'Dockerfile');
          if (!await this.fs.exists(dockerfilePath)) {
            result = 'failed';
            message = `${rule.description} - No Dockerfile found at repository root`;
          }
        }
        break;

      case 'service-boundaries':
        if (rule.id === 'F3-R02') {
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
        if (rule.id === 'F1-R11') {
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
        if (rule.id === 'F1-R09') {
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
        if (rule.id === 'F1-R10') {
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

      default:
        result = 'skipped';
        break;
    }

    return { rule, result, message };
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
