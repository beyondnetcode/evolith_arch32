/**
 * CODEOWNERS enrichment (GT-518 · EAG-13).
 *
 * Resolves the accountable `owner` of a {@link Violation} from a GitHub/GitLab
 * `CODEOWNERS` file — the source of truth most repos already maintain — so the CI/PR
 * drift gate can cite WHO owns the ADR a change violated. This complements the IDP
 * ownership ingestion in `./ownership` (Backstage/Port/Cortex): CODEOWNERS is the
 * git-native fallback when no IDP blueprint exists.
 *
 * Layering: PURE. Reading `.github/CODEOWNERS` off disk is the caller's (infra) concern;
 * these functions take the already-read file CONTENT and emit the parsed rules + a
 * resolver + the same `enrichViolationsWith*` shape as `./ownership`.
 */

import type { Violation } from './violation';

/** One parsed CODEOWNERS line: a path pattern and its accountable owners. */
export interface CodeownersRule {
  /** Raw path pattern as written (e.g. `/src/`, `*.ts`, `docs/adr/**`). */
  readonly pattern: string;
  /** Owners (teams/users) verbatim, e.g. `@org/platform`, `a@b.com`. */
  readonly owners: readonly string[];
  /** Source order (0-based). Last matching rule wins, so a higher index outranks a lower one. */
  readonly order: number;
}

/** Normalize a repo-relative path for matching: posix separators, strip `./` and leading/trailing `/`. */
function normalizePath(p: string): string {
  // Char-based trimming (no `^\/+` / `\/+$` regexes) to avoid polynomial
  // backtracking (ReDoS) on inputs with many leading/trailing slashes.
  let s = p.replace(/\\/g, '/').trim();
  if (s.startsWith('./')) s = s.slice(2);
  let start = 0;
  let end = s.length;
  while (start < end && s.charCodeAt(start) === 47 /* '/' */) start += 1;
  while (end > start && s.charCodeAt(end - 1) === 47) end -= 1;
  return s.slice(start, end);
}

/**
 * Parse a CODEOWNERS file's CONTENT into ordered {@link CodeownersRule}s. Blank lines and
 * `#` comments are dropped; a line with a pattern but no owners is dropped (it "unsets"
 * ownership in the spec — we simply record no rule). Order is preserved for last-match-wins.
 */
export function parseCodeowners(content: string): CodeownersRule[] {
  const rules: CodeownersRule[] = [];
  const lines = content.split(/\r?\n/);
  for (const raw of lines) {
    // Strip trailing `#` comment via indexOf (no `#.*$` regex — avoids ReDoS).
    const hashIdx = raw.indexOf('#');
    const line = (hashIdx === -1 ? raw : raw.slice(0, hashIdx)).trim();
    if (line.length === 0) continue;
    const [pattern, ...owners] = line.split(/\s+/);
    if (!pattern || owners.length === 0) continue;
    rules.push({ pattern, owners, order: rules.length });
  }
  return rules;
}

/**
 * Compile a CODEOWNERS pattern to a RegExp over normalized repo-relative paths.
 * Supports the common gitignore-style semantics CODEOWNERS uses:
 *  - a leading `/` OR any internal `/` anchors the pattern to the repo root;
 *  - a bare name (`*.ts`, `Dockerfile`) matches at ANY depth;
 *  - a trailing `/` (and, implicitly, any dir prefix) matches the whole subtree;
 *  - `*` matches within a segment, `**` (and `**​/`) matches across directories, `?` one char.
 */
export function codeownersPatternToRegExp(pattern: string): RegExp {
  let p = pattern.trim();
  const dirOnly = p.endsWith('/');
  if (dirOnly) p = p.slice(0, -1);
  const anchored = p.startsWith('/');
  if (anchored) p = p.slice(1);
  const hasInternalSlash = p.includes('/');

  let body = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '*') {
      if (p[i + 1] === '*') {
        i++;
        if (p[i + 1] === '/') {
          i++;
          body += '(?:.*/)?';
        } else {
          body += '.*';
        }
      } else {
        body += '[^/]*';
      }
    } else if (c === '?') {
      body += '[^/]';
    } else if (/[.+^${}()|[\]\\]/.test(c)) {
      body += `\\${c}`;
    } else {
      body += c;
    }
  }

  const left = anchored || hasInternalSlash ? '^' : '^(?:.*/)?';
  // A file pattern matches the file; a dir (or dir-prefix) pattern matches the whole subtree.
  const right = '(?:/.*)?$';
  return new RegExp(left + body + right);
}

/**
 * Resolve the owners of a file by CODEOWNERS last-match-wins precedence. Returns the owners of
 * the LAST rule (by source order) whose pattern matches, or `undefined` when nothing matches.
 */
export function resolveCodeowner(filePath: string, rules: readonly CodeownersRule[]): readonly string[] | undefined {
  const file = normalizePath(filePath);
  if (file.length === 0) return undefined;
  let match: CodeownersRule | undefined;
  for (const rule of rules) {
    if (codeownersPatternToRegExp(rule.pattern).test(file)) {
      if (!match || rule.order > match.order) match = rule;
    }
  }
  return match?.owners;
}

/**
 * Enrich violations with a resolved `owner` from CODEOWNERS, WITHOUT overwriting an owner a
 * violation already carries (e.g. from IDP ownership). Owners are joined with a space (the
 * CODEOWNERS wire format). Returns new objects; never mutates the inputs. `owner` is derived
 * metadata excluded from the fingerprint.
 */
export function enrichViolationsWithCodeowners(
  violations: readonly Violation[],
  rules: readonly CodeownersRule[],
): Violation[] {
  return violations.map((v) => {
    if (v.owner || !v.file) return v;
    const owners = resolveCodeowner(v.file, rules);
    return owners && owners.length > 0 ? { ...v, owner: owners.join(' ') } : v;
  });
}
