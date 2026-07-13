/**
 * Structurizr `.dsl` text → normalized {@link C4Model} (GT-528 · axis 2 — positioning §13.2).
 *
 * The ingestion/connector step named as a follow-on in {@link ./c4-compiler}: it lifts the raw
 * Structurizr DSL grammar into the normalized {@link C4Model} that {@link compileC4ToBoundaryRules}
 * turns into executable boundary rules. Kept PURE and dependency-free: text in, model out, no I/O.
 *
 * Supported subset (enough to drive the boundary compiler):
 *  - element definitions: `ident = container "Name"` or, with a code mapping,
 *    `ident = container "Name" { tags "path=src/domain,import=src/domain,adr=ADR-0002" }`.
 *    The element keyword (`container`, `component`, `softwareSystem`, `person`, …) is accepted
 *    generically — only the `ident`, `"Name"`, and optional tags/properties string matter here.
 *  - relationships: `ident -> ident "optional description"`.
 *
 * Everything else (the `workspace { … }`, `model { … }`, `views { … }` scaffolding, stray braces,
 * comments, blank lines) is IGNORED rather than rejected: the parser reads the common subset out
 * of a real file without needing the full grammar.
 */

import type { C4Element, C4Model, C4Relationship } from './c4-compiler';

/** `ident = keyword "Name"` capturing whatever follows the name (`{`, an inline block, or nothing). */
const ELEMENT_OPEN_RE =
  /^([A-Za-z_][\w-]*)\s*=\s*[A-Za-z_]\w*\s+"([^"]*)"\s*(.*)$/;
/** `source -> destination` with an optional quoted description (and trailing tokens). */
const RELATIONSHIP_RE = /^([A-Za-z_][\w-]*)\s*->\s*([A-Za-z_][\w-]*)\b/;
/** A quoted tags/properties string inside an element block: `tags "k=v,k=v"` or bare `"k=v,…"`. */
const TAGS_RE = /"([^"]*)"/;

/** Parse a `path=…,import=…,adr=…` tag string into the code-mapping fields of a {@link C4Element}. */
function parseTags(raw: string): Pick<C4Element, 'path' | 'importPrefix' | 'adrRef'> {
  const out: { path?: string; importPrefix?: string; adrRef?: string } = {};
  for (const pair of raw.split(',')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const key = pair.slice(0, eq).trim().toLowerCase();
    const value = pair.slice(eq + 1).trim();
    if (!value) continue;
    if (key === 'path') out.path = value;
    else if (key === 'import' || key === 'importprefix') out.importPrefix = value;
    else if (key === 'adr' || key === 'adrref') out.adrRef = value;
  }
  return out;
}

/** Strip line comments (`//` and `#`) — kept simple; the subset never quotes those tokens. */
function stripComment(line: string): string {
  const hashes = line.indexOf('#');
  const slashes = line.indexOf('//');
  let cut = -1;
  if (hashes !== -1) cut = hashes;
  if (slashes !== -1 && (cut === -1 || slashes < cut)) cut = slashes;
  return cut === -1 ? line : line.slice(0, cut);
}

/**
 * Parse a minimal Structurizr DSL document into a normalized {@link C4Model}. Lines that don't
 * match the supported element/relationship forms are ignored, so surrounding workspace/model/views
 * scaffolding passes through harmlessly.
 */
export function parseStructurizrDsl(dsl: string): C4Model {
  const elements: C4Element[] = [];
  const relationships: C4Relationship[] = [];
  const lines = dsl.split(/\r?\n/).map((l) => stripComment(l).trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Relationships take precedence: `a -> b` is never a valid element definition.
    const rel = RELATIONSHIP_RE.exec(line);
    if (rel) {
      relationships.push({ source: rel[1], destination: rel[2] });
      continue;
    }

    const el = ELEMENT_OPEN_RE.exec(line);
    if (el) {
      const [, id, name, rest] = el;
      const element: { -readonly [K in keyof C4Element]: C4Element[K] } = { id, name };

      // Collect the element's `{ … }` block whether inline or spread across lines. Real .dsl
      // wraps the block: `domain = container "Domain" {` / `tags "…"` / `}`. Without joining,
      // the tags line would be dropped and the element silently lost (no boundary rules).
      if (rest.includes('{')) {
        let block = rest.slice(rest.indexOf('{') + 1);
        while (!block.includes('}') && i + 1 < lines.length) {
          i += 1;
          block += ` ${lines[i]}`;
        }
        const close = block.indexOf('}');
        if (close !== -1) block = block.slice(0, close);

        const tagsMatch = TAGS_RE.exec(block);
        if (tagsMatch) {
          const mapping = parseTags(tagsMatch[1]);
          if (mapping.path !== undefined) element.path = mapping.path;
          if (mapping.importPrefix !== undefined) element.importPrefix = mapping.importPrefix;
          if (mapping.adrRef !== undefined) element.adrRef = mapping.adrRef;
        }
      }

      elements.push(element);
      continue;
    }
    // Unrecognized line (braces, keywords, views…) — ignore.
  }

  return { elements, relationships };
}
