import * as path from 'path';
import * as fs from 'fs-extra';
import { LAYER_ORDER, LAYER_PATTERNS } from './types';

export async function findSourceFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir);
  const promises = entries.map(async (entry) => {
    const fullPath = path.join(dir, entry);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist' && entry !== 'build') {
      return findSourceFiles(fullPath);
    }
    if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry)) {
      return [fullPath];
    }
    return [];
  });
  return (await Promise.all(promises)).flat();
}

export async function extractImports(filePath: string): Promise<string[]> {
  try {
    const ts = await import('typescript');
    const content = await fs.readFile(filePath, 'utf-8');
    const imports: string[] = [];

    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    const pushIfLocal = (p: string | undefined) => {
      if (p && !p.startsWith('node:') && !p.startsWith('http')) imports.push(p);
    };

    const visit = (node: any) => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        pushIfLocal(node.moduleSpecifier.text);
      } else if (ts.isCallExpression(node)) {
        const arg = node.arguments[0];
        const isStringArg = arg && ts.isStringLiteral(arg);
        if (node.expression && ts.isIdentifier(node.expression) && node.expression.text === 'require' && isStringArg) {
          pushIfLocal(arg.text);
        } else if (node.expression?.kind === ts.SyntaxKind.ImportKeyword && isStringArg) {
          pushIfLocal(arg.text);
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

export function detectLayer(filePath: string): string | undefined {
  for (const [layer, patterns] of Object.entries(LAYER_PATTERNS)) {
    if (patterns.some(p => p.test(filePath))) return layer;
  }
  return undefined;
}

export function detectContext(filePath: string): string | undefined {
  const srcIndex = filePath.indexOf('src/');
  if (srcIndex === -1) return undefined;
  const parts = filePath.slice(srcIndex + 4).split('/');
  if (parts.length < 2) return undefined;
  const potentialContext = parts[0];
  if (LAYER_ORDER.includes(potentialContext) || ['index.ts', 'main.ts', 'app.ts'].includes(potentialContext)) {
    return undefined;
  }
  return potentialContext;
}

export function resolveImport(graph: Map<string, unknown>, fromFile: string, importPath: string): string | null {
  if (!importPath.startsWith('.')) return null;
  const fromDir = path.dirname(fromFile);
  const resolved = path.normalize(path.join(fromDir, importPath));

  if (!resolved.endsWith('.ts') && !resolved.endsWith('.js')) {
    const tsPath = `${resolved}.ts`;
    if (graph.has(tsPath)) return tsPath;
    const indexPath = path.join(resolved, 'index.ts');
    if (graph.has(indexPath)) return indexPath;
    const jsPath = `${resolved}.js`;
    if (graph.has(jsPath)) return jsPath;
  }
  if (graph.has(resolved)) return resolved;
  return null;
}
