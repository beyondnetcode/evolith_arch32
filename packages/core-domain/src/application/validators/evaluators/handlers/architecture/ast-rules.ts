import * as path from 'path';
const ts: any = require('typescript');
import { IFileSystem } from '../../../../../domain/interfaces';
import { NormalizedRule } from '../../../../../domain/models/normalized-rule';
import { EvaluationContext } from '../../evaluator.interface';
import { SubResult, PASSED, SKIPPED, getAllFilesRecursive } from './shared';

export const AST_CATEGORIES = new Set([
  'separation-of-concerns', 'dependency-injection', 'static-analysis', 'domain-purity',
]);

function parse(file: string, content: string) {
  return ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
}

function walk(node: any, visit: (n: any) => void) {
  visit(node);
  ts.forEachChild(node, (child: any) => walk(child, visit));
}

function importPath(node: any): string {
  return node.moduleSpecifier.getText().replace(/['"]/g, '');
}

export async function evaluateAstRule(rule: NormalizedRule, ctx: EvaluationContext, fs: IFileSystem): Promise<SubResult> {
  const srcPath = path.join(ctx.satellitePath, 'src');
  if (!await fs.exists(srcPath)) return PASSED;
  const fail = (reason: string): SubResult => ({ result: 'failed', message: `${rule.description} - ${reason}` });

  switch (rule.category) {
    case 'separation-of-concerns':
      if (rule.id !== 'MM-R11') return PASSED;
      for (const file of (await getAllFilesRecursive(fs, srcPath)).filter(isLogicLayerSource)) {
        const sourceFile = parse(file, await fs.readFile(file));
        let hasUiImport = false;
        walk(sourceFile, n => {
          if (ts.isImportDeclaration(n) && ['@clack/prompts', 'inquirer', 'commander', 'express'].includes(importPath(n))) {
            hasUiImport = true;
          }
        });
        if (hasUiImport) return fail(`UI/CLI library imported in logic layer file: ${file}`);
      }
      return PASSED;

    case 'dependency-injection':
      if (rule.id !== 'MM-R09') return PASSED;
      for (const file of (await getAllFilesRecursive(fs, srcPath)).filter(isInjectableCandidate)) {
        const sourceFile = parse(file, await fs.readFile(file));
        let hasManualInstantiation = false;
        walk(sourceFile, n => {
          if (ts.isNewExpression(n)) {
            const className = n.expression.getText();
            if (/(Service|UseCase|Repository|Adapter)$/.test(className)) hasManualInstantiation = true;
          }
        });
        if (hasManualInstantiation) return fail(`Manual instantiation (new keyword) of Service/UseCase/Repository detected in: ${file}`);
      }
      return PASSED;

    case 'static-analysis':
      if (rule.id !== 'MM-R10') return PASSED;
      for (const file of (await getAllFilesRecursive(fs, srcPath)).filter(isAnalyzerSource)) {
        const content = await fs.readFile(file);
        const sourceFile = parse(file, content);
        let hasAstImport = false;
        walk(sourceFile, n => {
          if (ts.isImportDeclaration(n)) {
            const p = importPath(n);
            if (p === 'typescript' || p === '@babel/parser') hasAstImport = true;
          }
        });
        const usesRegexForCode = content.includes('RegExp') || content.includes('.match(');
        if (!hasAstImport && usesRegexForCode) {
          return fail(`Analyzer file appears to use Regex without an AST parser like typescript: ${file}`);
        }
      }
      return PASSED;

    case 'domain-purity':
      if (rule.id !== 'MM-R12') return PASSED;
      for (const file of (await getAllFilesRecursive(fs, srcPath)).filter(isDomainSource)) {
        const sourceFile = parse(file, await fs.readFile(file));
        let hasPersistenceImport = false;
        walk(sourceFile, n => {
          if (ts.isImportDeclaration(n)) {
            const p = importPath(n);
            if (p.includes('typeorm') || p.includes('mongoose') || p.includes('sequelize') || p.includes('prisma')) {
              hasPersistenceImport = true;
            }
          }
        });
        if (hasPersistenceImport) {
          return { result: 'failed', message: `[RECOMMENDATION] ${rule.description} - Domain persistence import detected in: ${file}. Consider using Data Mapper.` };
        }
      }
      return PASSED;

    default:
      return SKIPPED;
  }
}

function isLogicLayerSource(f: string): boolean {
  if (!f.endsWith('.ts') || f.endsWith('.spec.ts') || f.endsWith('.test.ts')) return false;
  return f.includes('/application/') || f.includes('/domain/') || f.includes('/use-cases/');
}

function isInjectableCandidate(f: string): boolean {
  return f.endsWith('.ts')
    && !f.endsWith('.spec.ts') && !f.endsWith('.test.ts')
    && !f.endsWith('app.module.ts') && !f.endsWith('registry.ts');
}

function isAnalyzerSource(f: string): boolean {
  return f.includes('analyzer') && f.endsWith('.ts') && !f.endsWith('.spec.ts');
}

function isDomainSource(f: string): boolean {
  return f.includes('/domain/') && f.endsWith('.ts') && !f.endsWith('.spec.ts');
}
