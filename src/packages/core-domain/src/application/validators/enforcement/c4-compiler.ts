/**
 * Structurizr / C4 → executable boundary rules (GT-528 · axis 2 — positioning §13.2).
 *
 * C4/Structurizr models describe the INTENDED architecture (which element may depend on which)
 * but never verify it against the real code — the diagram is dead documentation. This compiles a
 * normalized C4 model into {@link EditBoundaryRule}s (GT-526's shape), turning the model
 * EXECUTABLE: it feeds the edit-time gate and the PR/CI path alike. It complements GT-516's
 * `enforce:` compiler for the import-boundary class of rule.
 *
 * The transform is allowlist→denylist: in a C4 model an element may ONLY talk to its declared
 * relationships, so the forbidden imports for element E are the import prefixes of every OTHER
 * element E did not declare a relationship to. Only elements mapped to code (a `path` +
 * `importPrefix`) yield rules; abstract elements are skipped.
 *
 * Layering: PURE. Parsing the raw Structurizr `.dsl` grammar (or a Structurizr JSON export) into
 * this normalized {@link C4Model} is the ingestion/connector step (follow-on); this takes the
 * normalized model and emits rules.
 */

import type { EditBoundaryRule } from './edit-gate';

/** A C4 element (system/container/component), optionally mapped to code. */
export interface C4Element {
  readonly id: string;
  readonly name: string;
  /** Repo-relative path prefix this element's code lives under (enables `appliesTo`). */
  readonly path?: string;
  /** Import specifier prefix that identifies an import OF this element (enables `forbiddenImports`). */
  readonly importPrefix?: string;
  /** ADR the element's boundary traces to, when known. */
  readonly adrRef?: string;
}

/** A declared (allowed) dependency `source → destination`, by element id. */
export interface C4Relationship {
  readonly source: string;
  readonly destination: string;
}

export interface C4Model {
  readonly elements: readonly C4Element[];
  readonly relationships: readonly C4Relationship[];
}

export interface C4CompileOptions {
  /** Severity for generated rules (default `error` — a modelled boundary is authoritative). */
  readonly severity?: 'error' | 'warning';
}

/**
 * Compile a normalized {@link C4Model} into {@link EditBoundaryRule}s. Each code-mapped element
 * gets a rule forbidding imports of every element it did NOT declare a relationship to. Elements
 * without a `path` (nothing to apply to) or with no resulting forbidden imports are skipped.
 */
export function compileC4ToBoundaryRules(model: C4Model, options: C4CompileOptions = {}): EditBoundaryRule[] {
  const severity = options.severity ?? 'error';
  const allowedBySource = new Map<string, Set<string>>();
  for (const rel of model.relationships) {
    let set = allowedBySource.get(rel.source);
    if (!set) allowedBySource.set(rel.source, (set = new Set<string>()));
    set.add(rel.destination);
  }

  const rules: EditBoundaryRule[] = [];
  for (const element of model.elements) {
    if (!element.path) continue;
    const allowed = allowedBySource.get(element.id) ?? new Set<string>();
    const forbiddenImports = [
      ...new Set(
        model.elements
          .filter((other) => other.id !== element.id && !allowed.has(other.id) && !!other.importPrefix)
          .map((other) => other.importPrefix!),
      ),
    ].sort();
    if (forbiddenImports.length === 0) continue;
    rules.push({
      ruleId: `C4-${element.id}`,
      adrRef: element.adrRef,
      appliesTo: element.path,
      forbiddenImports,
      severity,
      message: `${element.name} may only depend on its declared C4 relationships (Structurizr model).`,
    });
  }
  return rules;
}
