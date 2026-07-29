/**
 * ModuleBoundaryRules (GT-632) — the native engine for the `from`/`to` clause a
 * governance rule authors in its `enforce.config`.
 *
 * WHY THIS IS NATIVE AND NOT A SHELL-OUT
 * --------------------------------------
 * HXA-01/02/04/05 each declare `enforce: { engine: 'enforcer', tool:
 * 'dependency-cruiser', config: { from: { path }, to: { path } } }`. The obvious
 * reading is "install dependency-cruiser and run it". That is the wrong call here,
 * for three reasons that are properties of THIS system, not opinions:
 *
 *  1. The Core is a STATELESS evaluation engine (ADR-0101). The Tracker assembles
 *     context and sends files INLINE; the Core reads them through `IFileSystem`,
 *     which on that path is an overlay with no bytes on disk. A subprocess cannot
 *     see an overlay. Shelling out therefore works on the CLI surface and silently
 *     does nothing on the REST one — the exact CLI/MCP/REST divergence the
 *     exploratory tester exists to block.
 *  2. `to.path: 'node_modules/(@nestjs|typeorm|...)/'` only ever matches if the
 *     satellite's `node_modules` is INSTALLED, because that is where the resolver
 *     writes the path it matches against. Validating a satellite we merely cloned
 *     would resolve nothing, report zero violations, and mark four blocking rules
 *     `passed`. A false pass is strictly worse than the `skipped` being fixed.
 *  3. The check itself is an import-graph predicate the repo already computes: the
 *     sibling `ast-rules.ts` implements exactly this shape for MM-R11 (no UI
 *     imports in the logic layer) and MM-R12 (no persistence imports in the
 *     domain), with the TypeScript AST over `IFileSystem`. What was missing was
 *     not the capability — it was that the capability was hard-coded to two rule
 *     ids instead of being driven by the clause the rules already carry.
 *
 * So this module generalizes the `ast-rules.ts` technique into a rule-driven one:
 * the authored `from`/`to` clause IS the program. No new dependency, no
 * subprocess, no sandbox, works identically on all three surfaces and on an
 * overlay filesystem.
 *
 * The enforcer seam is NOT removed by this. `CompositeRuleEvaluator` still routes
 * these rules to dependency-cruiser first when a host provisions it, and falls back
 * here when it is unavailable — which is precisely the `fallback: 'native'`
 * contract `policy-compiler.ts` has documented since GT-516.
 */

import * as path from 'path';
import * as ts from 'typescript';
import { IFileSystem } from '../../../../../domain/interfaces';
import { NormalizedRule } from '../../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext } from '../../evaluator.interface';
import { SubResult } from './shared';

/** Source extensions whose imports participate in the module graph. */
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];

/**
 * Directories never walked. `node_modules` is the load-bearing one: the whole
 * point of the `to.path: node_modules/...` clause is that a dependency is
 * EXTERNAL, and we model that from the import specifier rather than by reading
 * an install tree that may not exist.
 */
const PRUNED_DIRECTORIES = new Set([
  'node_modules', 'dist', 'build', 'out', 'coverage', '.git', '.next', '.turbo', 'vendor',
]);

/** Upper bound on files walked — a boundary check must not become the slow path. */
const MAX_FILES = 20_000;

// ---------------------------------------------------------------------------
// Compiling the authored clause
// ---------------------------------------------------------------------------

interface PathClause {
  readonly include?: RegExp;
  readonly exclude?: RegExp;
}

/** An authored boundary rule, lowered to two path predicates. */
export interface ModuleBoundaryCheck {
  readonly from: PathClause;
  readonly to: PathClause;
}

/** Why a rule's clause could not be lowered — reported, never guessed around. */
export interface UnsupportedClause {
  readonly unsupported: string;
}

function toRegExp(value: unknown): RegExp | undefined {
  const patterns = (Array.isArray(value) ? value : [value]).filter(
    (v): v is string => typeof v === 'string' && v.length > 0,
  );
  if (patterns.length === 0) return undefined;
  // dependency-cruiser ORs the entries of a `path` array.
  return new RegExp(patterns.length === 1 ? patterns[0] : patterns.map(p => `(?:${p})`).join('|'));
}

function toClause(raw: unknown): PathClause | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;
  const include = toRegExp(record['path']);
  const exclude = toRegExp(record['pathNot']);
  if (!include && !exclude) return undefined;
  return { include, exclude };
}

/** Clause keys this native engine does not implement — a rule using one is NOT claimed. */
const UNSUPPORTED_KEYS = ['circular', 'dependencyTypes', 'moreThanOneDependencyType', 'reachable', 'via'];

/**
 * Lower a rule's `enforce.config` into a {@link ModuleBoundaryCheck}.
 *
 * Returns {@link UnsupportedClause} rather than throwing or defaulting: a clause we
 * cannot express must degrade visibly. Note it NEVER falls back to an empty
 * (all-matching) predicate — an all-matching `to` would flag every import in the
 * repository, which is the false-positive mirror of the false pass.
 */
export function compileModuleBoundaryCheck(rule: NormalizedRule): ModuleBoundaryCheck | UnsupportedClause {
  const config = rule.enforce?.config;
  if (!config) return { unsupported: 'the rule declares no enforce.config from/to clause' };

  for (const side of ['from', 'to'] as const) {
    const raw = config[side];
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const used = UNSUPPORTED_KEYS.filter(k => k in (raw as Record<string, unknown>));
      if (used.length > 0) {
        return { unsupported: `enforce.config.${side} uses ${used.join('/')}, which the native module-graph engine does not implement` };
      }
    }
  }

  const from = toClause(config['from']);
  const to = toClause(config['to']);
  if (!from) return { unsupported: 'enforce.config.from carries no path/pathNot pattern' };
  if (!to) return { unsupported: 'enforce.config.to carries no path/pathNot pattern' };
  return { from, to };
}

/** Type guard so callers can branch without reaching into the union. */
export function isUnsupportedClause(v: ModuleBoundaryCheck | UnsupportedClause): v is UnsupportedClause {
  return 'unsupported' in v;
}

// ---------------------------------------------------------------------------
// Walking the workspace
// ---------------------------------------------------------------------------

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

function isSourceFile(name: string): boolean {
  return SOURCE_EXTENSIONS.some(ext => name.endsWith(ext)) && !name.endsWith('.d.ts');
}

/**
 * Every source file under `root`, as workspace-relative POSIX paths — the same
 * vocabulary the authored `from`/`to` patterns are written in
 * (`^src/(domain|core)/`).
 */
export async function collectSourceFiles(fs: IFileSystem, root: string): Promise<string[]> {
  const out: string[] = [];

  async function walk(dir: string, rel: string): Promise<void> {
    if (out.length >= MAX_FILES) return;
    let entries: string[];
    try {
      entries = await fs.readdirNames(dir);
    } catch {
      return; // an unreadable directory is not a governance verdict
    }
    for (const entry of entries) {
      if (entry === '.' || entry === '..') continue;
      if (PRUNED_DIRECTORIES.has(entry) || entry.startsWith('.')) continue;
      const full = path.join(dir, entry);
      const childRel = rel ? `${rel}/${entry}` : entry;
      let stat: { isDirectory(): boolean };
      try {
        stat = await fs.stat(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        await walk(full, childRel);
      } else if (isSourceFile(entry)) {
        out.push(childRel);
        if (out.length >= MAX_FILES) return;
      }
    }
  }

  if (!(await fs.exists(root))) return out;
  await walk(root, '');
  return out;
}

// ---------------------------------------------------------------------------
// Reading the import graph
// ---------------------------------------------------------------------------

/** Every module specifier a file depends on: static imports/exports, `require`, dynamic `import()`. */
export function moduleSpecifiersOf(fileName: string, content: string): string[] {
  const source = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true);
  const specifiers: string[] = [];

  const literal = (node: ts.Node | undefined): void => {
    if (node && ts.isStringLiteralLike(node)) specifiers.push(node.text);
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      literal(node.moduleSpecifier);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      literal(node.moduleReference.expression);
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const isRequire = ts.isIdentifier(callee) && callee.text === 'require';
      const isDynamicImport = callee.kind === ts.SyntaxKind.ImportKeyword;
      if (isRequire || isDynamicImport) literal(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return specifiers;
}

/**
 * The path(s) a specifier is tested against, in the vocabulary the authored
 * clause uses.
 *
 * A BARE specifier is an external dependency, so it is modelled as
 * `node_modules/<specifier>` — which is where dependency-cruiser's resolver would
 * have placed it. Both the bare and the trailing-slash form are returned because
 * authored `to.path` patterns idiomatically end in `/`
 * (`node_modules/(@nestjs|typeorm)/`, matching a file INSIDE the package). Testing
 * only the bare form would silently miss `import 'typeorm'` — a false negative on
 * a blocking rule, which is the failure mode this whole change exists to remove.
 *
 * A RELATIVE specifier is resolved against the importing file and, when possible,
 * against the real file set, so `../infrastructure/db` becomes
 * `src/infrastructure/db.ts`.
 */
export function candidatePathsFor(specifier: string, fromRelPath: string, known: ReadonlySet<string>): string[] {
  const withSlash = (p: string): string[] => [p, `${p}/`];

  if (!specifier.startsWith('.')) {
    if (path.posix.isAbsolute(specifier) || /^[a-zA-Z]:/.test(specifier)) return withSlash(toPosix(specifier));
    return withSlash(`node_modules/${specifier}`);
  }

  const joined = toPosix(path.posix.join(path.posix.dirname(fromRelPath), specifier));
  const candidates = [
    joined,
    ...SOURCE_EXTENSIONS.map(ext => `${joined}${ext}`),
    ...SOURCE_EXTENSIONS.map(ext => `${joined}/index${ext}`),
  ];
  const resolved = candidates.find(c => known.has(c));
  return withSlash(resolved ?? joined);
}

function matches(clause: PathClause, candidates: readonly string[]): boolean {
  if (clause.include && !candidates.some(c => clause.include!.test(c))) return false;
  if (clause.exclude && candidates.some(c => clause.exclude!.test(c))) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Evaluating
// ---------------------------------------------------------------------------

export interface BoundaryViolation {
  readonly file: string;
  readonly specifier: string;
  readonly resolved: string;
}

/** Run a compiled check over a workspace and return every forbidden edge found. */
export async function findBoundaryViolations(
  check: ModuleBoundaryCheck,
  fs: IFileSystem,
  root: string,
): Promise<{ readonly violations: BoundaryViolation[]; readonly filesInScope: number }> {
  const files = await collectSourceFiles(fs, root);
  const known = new Set(files);
  const inScope = files.filter(f => matches(check.from, [f]));

  const violations: BoundaryViolation[] = [];
  for (const rel of inScope) {
    let content: string;
    try {
      content = await fs.readFile(path.join(root, rel));
    } catch {
      continue;
    }
    for (const specifier of moduleSpecifiersOf(rel, content)) {
      const candidates = candidatePathsFor(specifier, rel, known);
      if (matches(check.to, candidates)) {
        violations.push({ file: rel, specifier, resolved: candidates[0] });
      }
    }
  }

  return { violations, filesInScope: inScope.length };
}

/**
 * Evaluate one authored boundary rule against the satellite workspace.
 *
 * A rule whose clause cannot be lowered returns `skipped` WITH the reason, so a
 * blocking rule in that state still fails the run under GT-595 AC2 rather than
 * disappearing.
 */
export async function evaluateModuleBoundaryRule(
  rule: NormalizedRule,
  ctx: WorkspaceEvaluationContext,
  fs: IFileSystem,
): Promise<SubResult> {
  const check = compileModuleBoundaryCheck(rule);
  if (isUnsupportedClause(check)) {
    return { result: 'skipped', message: `${rule.id}: ${check.unsupported}` };
  }

  const { violations, filesInScope } = await findBoundaryViolations(check, fs, ctx.satellitePath);

  if (violations.length > 0) {
    const shown = violations
      .slice(0, 3)
      .map(v => `${v.file} → ${v.specifier}`)
      .join('; ');
    const more = violations.length > 3 ? ` (+${violations.length - 3} more)` : '';
    return {
      result: 'failed',
      message: `${rule.title} — ${violations.length} forbidden import(s): ${shown}${more}`,
    };
  }

  // A vacuous pass is still a pass (dependency-cruiser behaves the same on an
  // empty `from` set), but it is stated rather than implied, so a reader can tell
  // "checked 41 files, clean" from "matched nothing, said nothing".
  return {
    result: 'passed',
    message: `${rule.id}: ${filesInScope} file(s) in scope, no forbidden imports`,
  };
}
