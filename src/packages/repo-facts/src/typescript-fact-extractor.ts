/**
 * TypeScript structural fact extractor (GT-589).
 *
 * Builds the canonical `RepoFacts` package — module graph + symbol graph — from a
 * TypeScript source tree, **outside the Core**. Everything side-effectful lives on
 * this side of the seam: the filesystem walk, the compiler program, the clock. The
 * Core receives the finished, content-hashed value inline on the
 * `EvaluationContext` and runs no indexer of its own (ADR-0101).
 *
 * Indexer choice, stated plainly: this uses the **TypeScript compiler API**, which
 * is the same type-resolution engine `scip-typescript` drives, and it emits
 * SCIP-shaped symbol ids (`<module>#<name>`). It is therefore a drop-in first
 * indexer that needs no external binary and no network. Ingesting a real
 * `index.scip` (and a tree-sitter path for languages without a type checker) is a
 * second adapter behind the same output shape; it is NOT implemented here.
 *
 * Determinism is a design constraint, not an outcome: files are visited in sorted
 * order, every emitted collection is sorted, and the only non-structural field
 * (`provenance.extractedAt`) is excluded from the canonical form the hash covers.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import {
  DEFAULT_MIN_STRUCTURAL_SIZE,
  REPO_FACTS_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/evaluation/contracts';
import type {
  ErrorMaskingFact,
  ImportFact,
  ModuleFact,
  ReferenceFact,
  RepoFacts,
  SymbolFact,
  SymbolFactKind,
} from '@beyondnet/evolith-core-domain/evaluation/contracts';
import { withContentHash } from './content-hash';
import { isFingerprintable, structuralFingerprintOf } from './structural-fingerprint';
import { scanErrorMasking } from './error-masking';

/** Version of this extractor, echoed into provenance. */
export const EXTRACTOR_VERSION = '1.1.0';
export const EXTRACTOR_ID = 'evolith-repo-facts';
export const INDEXER_ID = 'typescript-compiler-api';

export interface ExtractOptions {
  /** Absolute path to the repository root. Module ids are relative to it. */
  readonly rootDir: string;
  /** Repo-relative directories or files to index. Defaults to `['src']`. */
  readonly include?: readonly string[];
  /** Directory names skipped during the walk. */
  readonly exclude?: readonly string[];
  /** Revision the tree is at, when the caller knows it. */
  readonly revision?: string;
  /** Injected clock — the extractor never reads the wall clock directly. */
  readonly now?: () => string;
  /** Optional layer assignment, applied to each module id. */
  readonly layerOf?: (moduleId: string) => string | undefined;
  /**
   * GT-594 — floor, in normalized syntax nodes, below which a declaration is not
   * fingerprinted. Defaults to `DEFAULT_MIN_STRUCTURAL_SIZE`, the SAME constant the
   * Core's duplication signal filters on, so both sides describe one population.
   */
  readonly minStructuralSize?: number;
  /**
   * GT-594 — set `false` to skip the error-masking pass. The resulting fact base
   * carries NO `errorMasking` collection, which the Core reports as `not-measurable`
   * rather than as zero: "nobody looked" and "there are none" are different claims.
   */
  readonly scanErrorMasking?: boolean;
}

const DEFAULT_EXCLUDES = ['node_modules', 'dist', 'coverage', '.git', '.harness'];

const SOURCE_EXTENSIONS = ['.ts', '.tsx'];
const DECLARATION_SUFFIX = '.d.ts';

const toPosix = (p: string): string => p.split(path.sep).join('/');

const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Sorted, deterministic file walk. Skips declaration files and excluded dirs. */
export function collectSourceFiles(
  rootDir: string,
  include: readonly string[],
  exclude: readonly string[],
): string[] {
  const excluded = new Set(exclude);
  const found: string[] = [];

  const visit = (absolute: string): void => {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(absolute);
    } catch {
      return;
    }
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(absolute).sort(byString);
      for (const entry of entries) {
        if (excluded.has(entry)) continue;
        visit(path.join(absolute, entry));
      }
      return;
    }
    const ext = path.extname(absolute);
    if (!SOURCE_EXTENSIONS.includes(ext)) return;
    if (absolute.endsWith(DECLARATION_SUFFIX)) return;
    found.push(absolute);
  };

  for (const entry of [...include].sort(byString)) visit(path.resolve(rootDir, entry));
  return found.sort(byString);
}

function symbolKindOf(node: ts.Node): SymbolFactKind {
  if (ts.isClassDeclaration(node)) return 'class';
  if (ts.isInterfaceDeclaration(node)) return 'interface';
  if (ts.isFunctionDeclaration(node)) return 'function';
  if (ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) return 'method';
  if (ts.isTypeAliasDeclaration(node)) return 'type';
  if (ts.isEnumDeclaration(node)) return 'enum';
  if (ts.isVariableDeclaration(node)) return 'variable';
  return 'unknown';
}

function hasExportModifier(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return (modifiers ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

/** True when the import clause carries nothing but types (erased at runtime). */
function isTypeOnlyImport(clause: ts.ImportClause | undefined): boolean {
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  const bindings = clause.namedBindings;
  if (bindings && ts.isNamedImports(bindings)) {
    return bindings.elements.length > 0 && bindings.elements.every((e) => e.isTypeOnly);
  }
  return false;
}

/**
 * Extract the structural fact base of a TypeScript tree.
 *
 * Pure with respect to its inputs: given the same tree and the same injected
 * clock it returns the same value, and `contentHash` is stable even across clocks
 * because the timestamp is outside the canonical form.
 */
export function extractTypeScriptFacts(options: ExtractOptions): RepoFacts {
  const rootDir = path.resolve(options.rootDir);
  const include = options.include && options.include.length > 0 ? options.include : ['src'];
  const exclude = options.exclude ?? DEFAULT_EXCLUDES;
  const now = options.now ?? ((): string => new Date().toISOString());
  const minStructuralSize = options.minStructuralSize ?? DEFAULT_MIN_STRUCTURAL_SIZE;
  const wantErrorMasking = options.scanErrorMasking !== false;

  const fileNames = collectSourceFiles(rootDir, include, exclude);
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2021,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    allowJs: false,
    noEmit: true,
    skipLibCheck: true,
    strict: false,
  };
  const program = ts.createProgram(fileNames, compilerOptions);
  const checker = program.getTypeChecker();

  const moduleIdOf = new Map<string, string>(); // absolute fileName -> module id
  for (const fileName of fileNames) moduleIdOf.set(fileName, toPosix(path.relative(rootDir, fileName)));

  const modules: ModuleFact[] = [];
  const imports: ImportFact[] = [];
  const symbols: SymbolFact[] = [];
  const references: ReferenceFact[] = [];

  // Declaration node -> symbol id. Built first so reference resolution is an exact
  // lookup rather than a heuristic climb over the AST.
  const symbolIdOfDeclaration = new Map<ts.Node, string>();
  const declaredIds = new Set<string>();

  const sourceFiles = fileNames
    .map((f) => program.getSourceFile(f))
    .filter((sf): sf is ts.SourceFile => !!sf);

  // --- pass 1: modules + declared symbols ---
  for (const sf of sourceFiles) {
    const moduleId = moduleIdOf.get(sf.fileName);
    if (!moduleId) continue;
    modules.push({ id: moduleId, ...(options.layerOf ? { layer: options.layerOf(moduleId) } : {}) });

    const declare = (node: ts.Node, name: string, exported: boolean): void => {
      const id = moduleId + '#' + name;
      symbolIdOfDeclaration.set(node, id);
      if (declaredIds.has(id)) return; // overloads / merged declarations collapse to one symbol
      declaredIds.add(id);
      // GT-594 — fingerprint only declarations that HAVE a body, and only above the
      // node floor. Absent means "not fingerprinted", never "not duplicated".
      let fingerprint: Pick<SymbolFact, 'structuralHash' | 'structuralSize'> = {};
      if (isFingerprintable(node)) {
        const { hash, size } = structuralFingerprintOf(node);
        if (size >= minStructuralSize) fingerprint = { structuralHash: hash, structuralSize: size };
      }
      symbols.push({ id, name, kind: symbolKindOf(node), moduleId, exported, ...fingerprint });
    };

    for (const statement of sf.statements) {
      if (ts.isVariableStatement(statement)) {
        const exported = hasExportModifier(statement);
        for (const decl of statement.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) declare(decl, decl.name.text, exported);
        }
        continue;
      }
      if (
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isFunctionDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)
      ) {
        if (statement.name && ts.isIdentifier(statement.name)) {
          declare(statement, statement.name.text, hasExportModifier(statement));
        }
      }
    }
  }

  // --- pass 2: imports ---
  for (const sf of sourceFiles) {
    const from = moduleIdOf.get(sf.fileName);
    if (!from) continue;
    for (const statement of sf.statements) {
      let specifier: ts.Expression | undefined;
      let typeOnly = false;
      if (ts.isImportDeclaration(statement)) {
        specifier = statement.moduleSpecifier;
        typeOnly = isTypeOnlyImport(statement.importClause);
      } else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
        specifier = statement.moduleSpecifier;
        typeOnly = statement.isTypeOnly === true;
      }
      if (!specifier || !ts.isStringLiteral(specifier)) continue;
      const resolved = ts.resolveModuleName(specifier.text, sf.fileName, compilerOptions, ts.sys);
      const target = resolved.resolvedModule?.resolvedFileName;
      if (!target) continue;
      const to = moduleIdOf.get(path.resolve(target));
      if (!to || to === from) continue;
      imports.push({ from, to, typeOnly });
    }
  }

  // --- pass 3: symbol references ---
  const enclosingSymbolId = (node: ts.Node): string | undefined => {
    let cursor: ts.Node | undefined = node;
    while (cursor) {
      const id = symbolIdOfDeclaration.get(cursor);
      if (id) return id;
      cursor = cursor.parent;
    }
    return undefined;
  };

  const declarationSymbolId = (declaration: ts.Node): string | undefined => {
    let cursor: ts.Node | undefined = declaration;
    while (cursor) {
      const id = symbolIdOfDeclaration.get(cursor);
      if (id) return id;
      cursor = cursor.parent;
    }
    return undefined;
  };

  const seenReference = new Set<string>();
  for (const sf of sourceFiles) {
    if (!moduleIdOf.has(sf.fileName)) continue;
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node)) {
        // The name of a declaration is not a use of it.
        const parent = node.parent;
        const isDeclarationName =
          parent &&
          (ts.isClassDeclaration(parent) ||
            ts.isInterfaceDeclaration(parent) ||
            ts.isFunctionDeclaration(parent) ||
            ts.isTypeAliasDeclaration(parent) ||
            ts.isEnumDeclaration(parent) ||
            ts.isVariableDeclaration(parent) ||
            ts.isImportSpecifier(parent) ||
            ts.isImportClause(parent) ||
            ts.isExportSpecifier(parent) ||
            ts.isPropertyAccessExpression(parent)) &&
          (parent as { name?: ts.Node }).name === node;
        if (!isDeclarationName) {
          let symbol = checker.getSymbolAtLocation(node);
          if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
            try {
              symbol = checker.getAliasedSymbol(symbol);
            } catch {
              /* an unresolvable alias is simply not a fact */
            }
          }
          const declaration = symbol?.declarations?.[0];
          if (declaration) {
            const toSymbol = declarationSymbolId(declaration);
            const fromSymbol = enclosingSymbolId(node);
            if (fromSymbol && toSymbol && fromSymbol !== toSymbol) {
              const key = fromSymbol + ' ' + toSymbol;
              if (!seenReference.has(key)) {
                seenReference.add(key);
                references.push({ fromSymbol, toSymbol });
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sf, visit);
  }

  // --- pass 4: error-masking constructs (GT-594) ---
  // Skipped entirely when the caller opts out, so the collection stays UNDEFINED and
  // the Core reports the signal as not-measurable instead of inventing a zero.
  let errorMasking: ErrorMaskingFact[] | undefined;
  if (wantErrorMasking) {
    errorMasking = [];
    for (const sf of sourceFiles) {
      const moduleId = moduleIdOf.get(sf.fileName);
      if (!moduleId) continue;
      errorMasking.push(...scanErrorMasking(sf, { moduleId, symbolIdAt: enclosingSymbolId }));
    }
    errorMasking.sort(
      (a, b) =>
        byString(a.moduleId, b.moduleId) ||
        a.line - b.line ||
        byString(a.kind, b.kind) ||
        byString(a.symbolId ?? '', b.symbolId ?? ''),
    );
  }

  const draft: RepoFacts = {
    schemaVersion: REPO_FACTS_SCHEMA_VERSION,
    contentHash: '',
    provenance: {
      extractedBy: EXTRACTOR_ID,
      extractorVersion: EXTRACTOR_VERSION,
      indexer: INDEXER_ID,
      indexerVersion: ts.version,
      extractedAt: now(),
      ...(options.revision ? { revision: options.revision } : {}),
    },
    modules: modules.sort((a, b) => byString(a.id, b.id)),
    imports: imports.sort(
      (a, b) => byString(a.from, b.from) || byString(a.to, b.to) || Number(a.typeOnly) - Number(b.typeOnly),
    ),
    symbols: symbols.sort((a, b) => byString(a.id, b.id)),
    references: references.sort(
      (a, b) => byString(a.fromSymbol, b.fromSymbol) || byString(a.toSymbol, b.toSymbol),
    ),
    ...(errorMasking ? { errorMasking } : {}),
  };

  return withContentHash(draft);
}
