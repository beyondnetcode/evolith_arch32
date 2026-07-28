/**
 * GT-613 — the first adapter that actually implements {@link IStructuralReviewer}.
 *
 * The seam was shaped correctly and nothing was plugged into it: the port, the
 * provider and the rubric all existed, and `grep "implements IStructuralReviewer"`
 * returned zero. This is the adapter, and it is deliberately NOT a stub:
 *
 *   · it runs in-process with no external system, no model and no network;
 *   · it produces its findings from real measurements of the submitted files;
 *   · it is DETERMINISTIC and says so ({@link determinism}), so the Evidence the
 *     provider emits is labelled `deterministic` rather than borrowing the
 *     `probabilistic` label that belongs to an LLM-backed sibling. Mislabelling a
 *     deterministic measurement as probabilistic would corrupt the one axis
 *     ADR-0111 exists to protect.
 *
 * HONEST COVERAGE — the part that keeps this from being a pretend reviewer.
 * Four of the seven rubric standards are mechanically decidable from source text
 * and are the ONLY ones this adapter ever emits ({@link HEURISTIC_COVERED_STANDARDS}):
 *
 *   layering-and-boundaries  an import that points from an inner layer outward
 *   spaghetti-detection      nesting depth beyond the configured budget
 *   file-size-discipline     file / function length beyond the configured budget
 *   duplication-and-dry      an identical normalized block repeated
 *
 * `abstraction-quality` and `code-judo` are judgement calls about whether an
 * abstraction earns its keep — no text measurement decides them, so this adapter
 * emits NOTHING for them rather than inventing a proxy. `dead-code-and-scope` is
 * decidable only when the submitted file set is the complete reference closure
 * (otherwise every public export of a library reads as dead), so it is OFF by
 * default and opt-in via {@link HeuristicStructuralReviewerOptions.detectDeadCode}.
 * A silent partial reviewer would be worse than none: callers can read
 * {@link HeuristicStructuralReviewer.coveredStandards} and know what a clean run
 * did and did not look at.
 *
 * Scope: TypeScript/JavaScript-shaped source. Files with another extension are
 * skipped rather than measured with rules that do not apply to them.
 */

import type {
  IStructuralReviewer,
  RawStructuralFinding,
  StructuralReviewInput,
} from '../../domain/ports/structural-reviewer.port';
import type { StructuralStandardId } from '../../domain/rubrics/structural-review-rubric';
import { STRUCTURAL_STANDARD_BY_ID } from '../../domain/rubrics/structural-review-rubric';

/** The standards this adapter can decide from source text. */
export const HEURISTIC_COVERED_STANDARDS: readonly StructuralStandardId[] = [
  'layering-and-boundaries',
  'spaghetti-detection',
  'file-size-discipline',
  'duplication-and-dry',
];

/** Standards deliberately left to a judgement-capable (LLM/human) reviewer. */
export const HEURISTIC_UNCOVERED_STANDARDS: readonly StructuralStandardId[] = [
  'abstraction-quality',
  'code-judo',
];

export interface HeuristicStructuralReviewerOptions {
  /** Lines above which a file is flagged. Default 400. */
  readonly maxFileLines?: number;
  /** Lines above which a top-level function/method body is flagged. Default 60. */
  readonly maxFunctionLines?: number;
  /** Block-nesting depth above which control flow is flagged. Default 4. */
  readonly maxNestingDepth?: number;
  /** Length (in significant lines) of a repeated block that counts as duplication. Default 6. */
  readonly duplicateBlockLines?: number;
  /**
   * Opt in to dead-export detection. Sound ONLY when the submitted files are the
   * complete reference closure; otherwise a library's public API reads as dead.
   * Default false.
   */
  readonly detectDeadCode?: boolean;
}

const DEFAULTS = {
  maxFileLines: 400,
  maxFunctionLines: 60,
  maxNestingDepth: 4,
  duplicateBlockLines: 6,
  detectDeadCode: false,
} as const;

/** Layer rank by path segment; a HIGHER rank is further from the domain core. */
const LAYER_RANK: Readonly<Record<string, number>> = {
  domain: 0,
  application: 1,
  adapters: 2,
  infrastructure: 2,
  providers: 2,
};

const SOURCE_EXTENSIONS = /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/;

type SourceFile = { readonly path: string; readonly content: string };

export class HeuristicStructuralReviewer implements IStructuralReviewer {
  /**
   * This reviewer MEASURES; it does not judge. Read by
   * {@link StructuralReviewProvider} so the emitted Evidence carries the truthful
   * determinism class instead of the probabilistic default.
   */
  readonly determinism = 'deterministic' as const;

  private readonly opts: Required<HeuristicStructuralReviewerOptions>;

  constructor(options: HeuristicStructuralReviewerOptions = {}) {
    this.opts = {
      maxFileLines: options.maxFileLines ?? DEFAULTS.maxFileLines,
      maxFunctionLines: options.maxFunctionLines ?? DEFAULTS.maxFunctionLines,
      maxNestingDepth: options.maxNestingDepth ?? DEFAULTS.maxNestingDepth,
      duplicateBlockLines: options.duplicateBlockLines ?? DEFAULTS.duplicateBlockLines,
      detectDeadCode: options.detectDeadCode ?? DEFAULTS.detectDeadCode,
    };
  }

  /** Which rubric standards a clean run of THIS reviewer actually examined. */
  get coveredStandards(): readonly StructuralStandardId[] {
    return this.opts.detectDeadCode
      ? [...HEURISTIC_COVERED_STANDARDS, 'dead-code-and-scope']
      : HEURISTIC_COVERED_STANDARDS;
  }

  /**
   * Judge the submitted files. Findings come out in a STABLE order (by standard,
   * then by path, then by line) so two runs over the same input are byte-identical
   * — the provider hashes them into the Evidence provenance.
   *
   * No inline files ⇒ no findings. That is not a clean bill of health, and the
   * caller can tell the difference: `repositoryRef`-only input means this adapter
   * had nothing to read (it does no I/O by design).
   */
  async review(input: StructuralReviewInput): Promise<readonly RawStructuralFinding[]> {
    const files = (input.files ?? []).filter((f) => SOURCE_EXTENSIONS.test(f.path));
    if (files.length === 0) return [];

    const findings: RawStructuralFinding[] = [
      ...this.layering(files),
      ...files.flatMap((f) => this.nesting(f)),
      ...files.flatMap((f) => this.sizes(f)),
      ...this.duplication(files),
      ...(this.opts.detectDeadCode ? this.deadExports(files) : []),
    ];

    return findings.sort(
      (a, b) =>
        a.standardId.localeCompare(b.standardId) || (a.location ?? '').localeCompare(b.location ?? ''),
    );
  }

  // --- standards -----------------------------------------------------------

  /** An import that points from an inner layer to an outer one. */
  private layering(files: readonly SourceFile[]): RawStructuralFinding[] {
    const out: RawStructuralFinding[] = [];
    for (const file of files) {
      const fromRank = layerRankOf(file.path);
      if (fromRank === undefined) continue;
      for (const { specifier, line } of importsOf(file.content)) {
        if (!specifier.startsWith('.')) continue; // package imports carry no layer
        const target = resolveRelative(file.path, specifier);
        const toRank = layerRankOf(target);
        if (toRank === undefined || toRank <= fromRank) continue;
        out.push(
          this.finding(
            'layering-and-boundaries',
            `'${file.path}' imports '${specifier}', which reaches from the ` +
              `${layerNameOf(file.path)} layer outward into ${layerNameOf(target)}.`,
            `${file.path}:${line}`,
          ),
        );
      }
    }
    return out;
  }

  /** Block-nesting depth beyond the budget. */
  private nesting(file: SourceFile): RawStructuralFinding[] {
    let depth = 0;
    let peak = 0;
    let peakLine = 0;
    const lines = file.content.split('\n');
    lines.forEach((raw, i) => {
      const line = stripNoise(raw);
      for (const ch of line) {
        if (ch === '{') {
          depth += 1;
          if (depth > peak) {
            peak = depth;
            peakLine = i + 1;
          }
        } else if (ch === '}') {
          depth = Math.max(0, depth - 1);
        }
      }
    });
    if (peak <= this.opts.maxNestingDepth) return [];
    return [
      this.finding(
        'spaghetti-detection',
        `'${file.path}' nests ${peak} levels deep (budget ${this.opts.maxNestingDepth}); ` +
          'control flow at that depth cannot be reasoned about locally.',
        `${file.path}:${peakLine}`,
      ),
    ];
  }

  /** File length and top-level function-body length beyond their budgets. */
  private sizes(file: SourceFile): RawStructuralFinding[] {
    const out: RawStructuralFinding[] = [];
    const lines = file.content.split('\n');

    if (lines.length > this.opts.maxFileLines) {
      out.push(
        this.finding(
          'file-size-discipline',
          `'${file.path}' is ${lines.length} lines (budget ${this.opts.maxFileLines}); ` +
            'an oversized unit usually hides a missing decomposition.',
          `${file.path}:1`,
        ),
      );
    }

    for (const fn of functionBodies(lines)) {
      if (fn.lines <= this.opts.maxFunctionLines) continue;
      out.push(
        this.finding(
          'file-size-discipline',
          `'${fn.name}' spans ${fn.lines} lines (budget ${this.opts.maxFunctionLines}).`,
          `${file.path}:${fn.startLine}`,
        ),
      );
    }
    return out;
  }

  /** An identical normalized block of N significant lines appearing more than once. */
  private duplication(files: readonly SourceFile[]): RawStructuralFinding[] {
    const window = this.opts.duplicateBlockLines;
    const seen = new Map<string, string>(); // block → first location
    const reported = new Set<string>();
    const out: RawStructuralFinding[] = [];

    for (const file of files) {
      const significant = file.content
        .split('\n')
        .map((line, index) => ({ text: normalizeForDuplication(line), line: index + 1 }))
        .filter((entry) => entry.text.length > 0);

      for (let i = 0; i + window <= significant.length; i += 1) {
        const block = significant
          .slice(i, i + window)
          .map((e) => e.text)
          .join('\n');
        const here = `${file.path}:${significant[i].line}`;
        const first = seen.get(block);
        if (first === undefined) {
          seen.set(block, here);
          continue;
        }
        if (reported.has(block)) continue;
        reported.add(block);
        out.push(
          this.finding(
            'duplication-and-dry',
            `A ${window}-line block is repeated (first seen at ${first}); consolidate it ` +
              'only if a right abstraction exists.',
            here,
          ),
        );
      }
    }
    return out;
  }

  /** Exported symbols never referenced anywhere in the submitted closure. */
  private deadExports(files: readonly SourceFile[]): RawStructuralFinding[] {
    const out: RawStructuralFinding[] = [];
    for (const file of files) {
      for (const { name, line } of exportsOf(file.content)) {
        const referenced = files.some((other) =>
          countReferences(other.content, name) > (other.path === file.path ? 1 : 0),
        );
        if (referenced) continue;
        out.push(
          this.finding(
            'dead-code-and-scope',
            `Export '${name}' is never referenced in the submitted file set.`,
            `${file.path}:${line}`,
          ),
        );
      }
    }
    return out;
  }

  /** Build a finding at the standard's DEFAULT severity — this reviewer does not re-weight. */
  private finding(
    standardId: StructuralStandardId,
    message: string,
    location: string,
  ): RawStructuralFinding {
    const standard = STRUCTURAL_STANDARD_BY_ID.get(standardId);
    /* istanbul ignore next — the ids above are literals from the rubric union */
    if (!standard) throw new Error(`Unknown structural standard '${standardId}'.`);
    return { standardId, severity: standard.defaultSeverity, message, location };
  }
}

// --- text helpers (pure) ---------------------------------------------------

/** Strip line comments and string literals so braces inside them do not count. */
function stripNoise(line: string): string {
  return line
    .replace(/\\./g, '')
    .replace(/'[^']*'/g, "''")
    .replace(/"[^"]*"/g, '""')
    .replace(/`[^`]*`/g, '``')
    .replace(/\/\/.*$/, '')
    .replace(/\/\*.*?\*\//g, '');
}

/** `import … from 'x'` / `require('x')` specifiers with their 1-based line. */
function importsOf(content: string): { specifier: string; line: number }[] {
  const out: { specifier: string; line: number }[] = [];
  content.split('\n').forEach((raw, index) => {
    const match =
      raw.match(/\bfrom\s+['"]([^'"]+)['"]/) ?? raw.match(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/);
    if (match) out.push({ specifier: match[1], line: index + 1 });
  });
  return out;
}

/** Exported symbol names with their 1-based declaration line. */
function exportsOf(content: string): { name: string; line: number }[] {
  const out: { name: string; line: number }[] = [];
  content.split('\n').forEach((raw, index) => {
    const match = raw.match(
      /^\s*export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|interface|type|enum)\s+([A-Za-z_$][\w$]*)/,
    );
    if (match) out.push({ name: match[1], line: index + 1 });
  });
  return out;
}

function countReferences(content: string, name: string): number {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return content.match(new RegExp(`\\b${escaped}\\b`, 'g'))?.length ?? 0;
}

/**
 * Function/method bodies opened at depth 0 or 1, with their line span. Line-based
 * on purpose: no parser is pulled in for a size budget, and an approximation that
 * over-reports by a line or two on a size metric is harmless.
 */
function functionBodies(lines: readonly string[]): { name: string; startLine: number; lines: number }[] {
  const out: { name: string; startLine: number; lines: number }[] = [];
  const open: { name: string; startLine: number; depth: number }[] = [];
  let depth = 0;

  lines.forEach((raw, index) => {
    const line = stripNoise(raw);
    const declaration = line.match(
      /(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(|^\s*(?:public|private|protected|async|static|\s)*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*[:{])/,
    );
    const opensHere = line.includes('{');

    for (const ch of line) {
      if (ch === '{') {
        depth += 1;
        if (declaration && depth <= 2 && open.every((o) => o.depth !== depth)) {
          open.push({
            name: declaration[1] ?? declaration[2] ?? declaration[3] ?? 'anonymous',
            startLine: index + 1,
            depth,
          });
        }
      } else if (ch === '}') {
        const top = open[open.length - 1];
        if (top && top.depth === depth) {
          open.pop();
          out.push({ name: top.name, startLine: top.startLine, lines: index + 1 - top.startLine + 1 });
        }
        depth = Math.max(0, depth - 1);
      }
    }
    if (!opensHere) return;
  });

  return out;
}

/** Normalize a line for duplication comparison: no indentation, no comments, no blanks. */
function normalizeForDuplication(line: string): string {
  // `indexOf` rather than /\/\/.*$/ — CodeQL flags that pattern as polynomial ReDoS,
  // and it is right: the input is a line of a file this reviewer was pointed at, so
  // it is attacker-influenced whenever the reviewer runs over untrusted code, and a
  // line of many `//` makes the engine rescan to end-of-line from every position.
  // A linear scan for the first `//` is the same semantics with no backtracking.
  const commentAt = line.indexOf('//');
  const stripped = (commentAt === -1 ? line : line.slice(0, commentAt)).trim();
  if (stripped === '' || stripped.startsWith('*') || stripped.startsWith('/*')) return '';
  return stripped.replace(/\s+/g, ' ');
}

/** Layer rank of a path, or undefined when the path names no known layer. */
function layerRankOf(path: string): number | undefined {
  for (const segment of path.split('/')) {
    const rank = LAYER_RANK[segment];
    if (rank !== undefined) return rank;
  }
  return undefined;
}

function layerNameOf(path: string): string {
  for (const segment of path.split('/')) {
    if (LAYER_RANK[segment] !== undefined) return segment;
  }
  return 'unknown';
}

/** POSIX-style resolution of a relative specifier against the importing file. */
function resolveRelative(fromPath: string, specifier: string): string {
  const base = fromPath.split('/').slice(0, -1);
  for (const part of specifier.split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..') base.pop();
    else base.push(part);
  }
  return base.join('/');
}
