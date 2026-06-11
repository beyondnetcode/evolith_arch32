import * as path from 'path';
import * as fs from 'fs-extra';

export interface ImportNode {
  file: string;
  imports: string[];
  layer?: string;
  context?: string;
}

export interface LayerViolation {
  ruleId: string;
  fromLayer: string;
  toLayer: string;
  fromFile: string;
  toFile: string;
  severity: 'MUST' | 'SHOULD' | 'MAY';
  blocking: boolean;
}

export interface ContextViolation {
  ruleId: string;
  fromContext: string;
  toContext: string;
  fromFile: string;
  toFile: string;
  severity: 'MUST' | 'SHOULD' | 'MAY';
  blocking: boolean;
}

export interface ArchitectureDepth {
  layerViolations: LayerViolation[];
  contextViolations: ContextViolation[];
  couplingMetrics: CouplingMetrics;
  dependencyInversionIssues: DependencyInversionIssue[];
}

export interface CouplingMetrics {
  afferentCoupling: Record<string, number>;
  efferentCoupling: Record<string, number>;
  instability: Record<string, number>;
}

export interface DependencyInversionIssue {
  ruleId: string;
  file: string;
  issue: string;
  severity: 'MUST' | 'SHOULD' | 'MAY';
  blocking: boolean;
}

const LAYER_ORDER = ['domain', 'application', 'infrastructure', 'presentation'];

const LAYER_PATTERNS: Record<string, RegExp[]> = {
  domain: [
    /\/domain\//,
    /\/entities\//,
    /\/value-objects\//,
    /\/aggregates\//,
    /\/domain-services\//,
    /\/repositories\/(interfaces|ports)\//,
  ],
  application: [
    /\/application\//,
    /\/use-cases\//,
    /\/services\//,
    /\/commands\//,
    /\/queries\//,
    /\/handlers\//,
  ],
  infrastructure: [
    /\/infrastructure\//,
    /\/adapters\//,
    /\/persistence\//,
    /\/external\//,
    /\/database\//,
    /\/repositories\/(impl|implementations)\//,
  ],
  presentation: [
    /\/presentation\//,
    /\/api\//,
    /\/controllers\//,
    /\/routes\//,
    /\/graphql\//,
    /\/rest\//,
  ],
};

export class DeepArchitectureAnalyzer {
  private importGraph: Map<string, ImportNode> = new Map();
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  async analyze(): Promise<ArchitectureDepth> {
    await this.buildImportGraph();

    const layerViolations = this.detectLayerViolations();
    const contextViolations = this.detectContextViolations();
    const couplingMetrics = this.calculateCouplingMetrics();
    const dependencyInversionIssues = this.detectDependencyInversionIssues();

    return {
      layerViolations,
      contextViolations,
      couplingMetrics,
      dependencyInversionIssues,
    };
  }

  private async buildImportGraph(): Promise<void> {
    const srcDir = path.join(this.baseDir, 'src');
    if (!(await fs.pathExists(srcDir))) return;

    const files = await this.findSourceFiles(srcDir);

    for (const file of files) {
      const imports = await this.extractImports(file);
      const relativeFile = path.relative(this.baseDir, file);
      this.importGraph.set(relativeFile, {
        file: relativeFile,
        imports,
        layer: this.detectLayer(relativeFile),
        context: this.detectContext(relativeFile),
      });
    }
  }

  private async findSourceFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir);
    const promises = entries.map(async (entry) => {
      const fullPath = path.join(dir, entry);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist' && entry !== 'build') {
        return this.findSourceFiles(fullPath);
      } else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.tsx') || entry.endsWith('.js') || entry.endsWith('.jsx'))) {
        return [fullPath];
      }
      return [];
    });

    const results = await Promise.all(promises);
    return results.flat();
  }

  private async extractImports(filePath: string): Promise<string[]> {
    try {
      const ts = await import('typescript');
      const content = await fs.readFile(filePath, 'utf-8');
      const imports: string[] = [];

      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      const visit = (node: any) => {
        if (ts.isImportDeclaration(node)) {
          if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const importPath = node.moduleSpecifier.text;
            if (importPath && !importPath.startsWith('node:') && !importPath.startsWith('http')) {
              imports.push(importPath);
            }
          }
        } else if (ts.isCallExpression(node)) {
          if (node.expression && ts.isIdentifier(node.expression)) {
            if (node.expression.text === 'require') {
              const arg = node.arguments[0];
              if (arg && ts.isStringLiteral(arg)) {
                const importPath = arg.text;
                if (importPath && !importPath.startsWith('node:') && !importPath.startsWith('http')) {
                  imports.push(importPath);
                }
              }
            }
          } else if (node.expression && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
             const arg = node.arguments[0];
             if (arg && ts.isStringLiteral(arg)) {
                const importPath = arg.text;
                if (importPath && !importPath.startsWith('node:') && !importPath.startsWith('http')) {
                  imports.push(importPath);
                }
             }
          }
        }
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
      return imports;
    } catch {
      return [];
    }
  }

  private detectLayer(filePath: string): string | undefined {
    for (const [layer, patterns] of Object.entries(LAYER_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(filePath)) {
          return layer;
        }
      }
    }
    return undefined;
  }

  private detectContext(filePath: string): string | undefined {
    const srcIndex = filePath.indexOf('src/');
    if (srcIndex === -1) return undefined;

    const afterSrc = filePath.slice(srcIndex + 4);
    const parts = afterSrc.split('/');

    if (parts.length >= 2) {
      const potentialContext = parts[0];
      if (!LAYER_ORDER.includes(potentialContext) && !['index.ts', 'main.ts', 'app.ts'].includes(potentialContext)) {
        return potentialContext;
      }
    }

    return undefined;
  }

  private detectLayerViolations(): LayerViolation[] {
    const violations: LayerViolation[] = [];

    for (const [fromFile, node] of this.importGraph.entries()) {
      if (!node.layer) continue;

      const fromLayerIndex = LAYER_ORDER.indexOf(node.layer);
      if (fromLayerIndex === -1) continue;

      for (const importPath of node.imports) {
        const resolvedPath = this.resolveImport(fromFile, importPath);
        if (!resolvedPath) continue;

        const targetNode = this.importGraph.get(resolvedPath);
        if (!targetNode?.layer) continue;

        const toLayerIndex = LAYER_ORDER.indexOf(targetNode.layer);
        if (toLayerIndex === -1) continue;

        if (toLayerIndex < fromLayerIndex) {
          violations.push({
            ruleId: 'ARCH-LAYER-01',
            fromLayer: node.layer,
            toLayer: targetNode.layer,
            fromFile,
            toFile: resolvedPath,
            severity: 'MUST',
            blocking: true,
          });
        }
      }
    }

    return violations;
  }

  private detectContextViolations(): ContextViolation[] {
    const violations: ContextViolation[] = [];
    const contextFiles = new Map<string, string[]>();

    for (const [file, node] of this.importGraph.entries()) {
      if (node.context) {
        if (!contextFiles.has(node.context)) {
          contextFiles.set(node.context, []);
        }
        contextFiles.get(node.context)!.push(file);
      }
    }

    for (const [fromFile, node] of this.importGraph.entries()) {
      if (!node.context) continue;

      for (const importPath of node.imports) {
        const resolvedPath = this.resolveImport(fromFile, importPath);
        if (!resolvedPath) continue;

        const targetNode = this.importGraph.get(resolvedPath);
        if (!targetNode?.context || targetNode.context === node.context) continue;

        const targetContextFiles = contextFiles.get(targetNode.context) || [];
        if (targetContextFiles.includes(resolvedPath)) {
          violations.push({
            ruleId: 'ARCH-CTX-01',
            fromContext: node.context,
            toContext: targetNode.context,
            fromFile,
            toFile: resolvedPath,
            severity: 'MUST',
            blocking: true,
          });
        }
      }
    }

    return violations;
  }

  private calculateCouplingMetrics(): CouplingMetrics {
    const afferent: Record<string, number> = {};
    const efferent: Record<string, number> = {};

    for (const [file, node] of this.importGraph.entries()) {
      if (!node.context) continue;

      if (!afferent[node.context]) afferent[node.context] = 0;
      if (!efferent[node.context]) efferent[node.context] = 0;
    }

    for (const [fromFile, node] of this.importGraph.entries()) {
      if (!node.context) continue;

      for (const importPath of node.imports) {
        const resolvedPath = this.resolveImport(fromFile, importPath);
        if (!resolvedPath) continue;

        const targetNode = this.importGraph.get(resolvedPath);
        if (!targetNode?.context || targetNode.context === node.context) continue;

        efferent[node.context] = (efferent[node.context] || 0) + 1;
        afferent[targetNode.context] = (afferent[targetNode.context] || 0) + 1;
      }
    }

    const instability: Record<string, number> = {};
    const allContexts = new Set([...Object.keys(afferent), ...Object.keys(efferent)]);

    for (const context of allContexts) {
      const ce = efferent[context] || 0;
      const ca = afferent[context] || 0;
      const total = ce + ca;
      instability[context] = total > 0 ? ce / total : 0;
    }

    return {
      afferentCoupling: afferent,
      efferentCoupling: efferent,
      instability,
    };
  }

  private detectDependencyInversionIssues(): DependencyInversionIssue[] {
    const issues: DependencyInversionIssue[] = [];

    for (const [file, node] of this.importGraph.entries()) {
      if (node.layer !== 'domain') continue;

      for (const importPath of node.imports) {
        if (importPath.includes('typeorm') || importPath.includes('prisma') || importPath.includes('mongoose') || importPath.includes('sequelize')) {
          issues.push({
            ruleId: 'ARCH-DI-01',
            file,
            issue: `Domain layer directly imports ORM library: ${importPath}`,
            severity: 'MUST',
            blocking: true,
          });
        }

        if (importPath.includes('express') || importPath.includes('fastify') || importPath.includes('koa') || importPath.includes('hono')) {
          issues.push({
            ruleId: 'ARCH-DI-02',
            file,
            issue: `Domain layer directly imports web framework: ${importPath}`,
            severity: 'MUST',
            blocking: true,
          });
        }

        if (importPath.startsWith('@nestjs')) {
          issues.push({
            ruleId: 'ARCH-DI-03',
            file,
            issue: `Domain layer imports NestJS framework: ${importPath}`,
            severity: 'SHOULD',
            blocking: false,
          });
        }
      }
    }

    return issues;
  }

  private resolveImport(fromFile: string, importPath: string): string | null {
    if (importPath.startsWith('.')) {
      const fromDir = path.dirname(fromFile);
      let resolved = path.normalize(path.join(fromDir, importPath));

      if (!resolved.endsWith('.ts') && !resolved.endsWith('.js')) {
        const tsPath = `${resolved}.ts`;
        if (this.importGraph.has(tsPath)) return tsPath;

        const indexPath = path.join(resolved, 'index.ts');
        if (this.importGraph.has(indexPath)) return indexPath;

        const jsPath = `${resolved}.js`;
        if (this.importGraph.has(jsPath)) return jsPath;
      }

      if (this.importGraph.has(resolved)) return resolved;
    }

    return null;
  }
}
