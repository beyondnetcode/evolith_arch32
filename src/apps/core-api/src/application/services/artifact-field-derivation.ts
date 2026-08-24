/**
 * Derives the FLAT FIELD LIST of an artifact from the JSON Schema the Core already publishes.
 *
 * WHY THIS EXISTS. The registry names an artifact and points at its schema's `$id`. A consumer
 * therefore learns that a PRD is required in discovery and still cannot find out what a PRD is
 * supposed to contain — the `$id` is an identity, not a location, and nothing dereferences it.
 * The satellite waiting on this (`evolith_tracker`) evaluates gate criteria against a flat field
 * map, so «a PRD has a field called metadata.identifier, it is a string, and it is required» is
 * the fact it needs. Without it a tenant can configure a criterion over a document and nothing
 * will ever read it, which makes the gate a presence check.
 *
 * The schemas are NOT rewritten to a flat shape. They stay the source; this derives a projection,
 * so a schema change propagates on the next read rather than needing a second file kept in sync.
 */

/** The field types a consumer's criteria can actually evaluate. */
export type ArtifactFieldType =
  | 'text'
  | 'rich-text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'enum'
  | 'url';

export interface ArtifactField {
  /** Dotted path from the document root — `metadata.identifier`. Stable: criteria reference it. */
  fieldPath: string;
  type: ArtifactFieldType;
  label: string;
  /**
   * The same field named in Spanish, when the corpus knows the word.
   *
   * It travels ALONGSIDE the English rather than replacing it, because a consumer serves many
   * readers from one sync: the Tracker fetches this catalogue every fifteen minutes, tenant-
   * agnostic and cached, and then renders it for whoever is looking. Publishing one language per
   * request would mean either a fetch per reader or a document in the wrong language.
   */
  labelEs?: string;
  /**
   * The SECTION this field sits in — the enclosing object, named — or absent at the root.
   *
   * It is published rather than left for the consumer to split off the path, because the section
   * is part of the shape and the shape is this repository's to describe. A consumer deriving it
   * would be re-deriving what is already known here, in a language it cannot get to: `technical
   * constraints` is available by splitting `technicalConstraints.cpuCoreLimit`, «Restricciones
   * técnicas» is not.
   */
  group?: string;
  groupEs?: string;
  required: boolean;
  enumValues?: string[];
  description?: string;
}

/**
 * What the derivation is given beyond the schema.
 *
 * Only the Spanish. English needs nothing: these keys ARE English, so a label derived from
 * `cpuCoreLimit` is right by construction. Spanish cannot be derived from an English identifier by
 * any amount of string-splitting — the words have to come from somewhere, and that asymmetry is
 * why one language is computed and the other is written down.
 */
export interface ArtifactFieldDerivationOptions {
  /**
   * Name → Spanish label. Keyed by the property NAME, so `status` is «Estado» everywhere, and the
   * same table names sections: an object is a property too, and `metadata` is «Metadatos» wherever
   * it encloses something.
   */
  labelsEs?: Record<string, string>;
}

export interface ArtifactFieldDerivation {
  fields: ArtifactField[];
  /**
   * Paths deliberately left out, and why. Collections have no operator that can judge them —
   * `gte`, `in-set` and `regex` all assume a single value — so publishing them as fields would
   * offer a consumer something it can select and never satisfy.
   *
   * Reported rather than dropped in silence: a caller comparing 13 sections against 9 fields
   * deserves to know the difference is arrays, not an incomplete schema.
   */
  omitted: { fieldPath: string; reason: string }[];
}

interface JsonSchemaNode {
  type?: string | string[];
  title?: string;
  /** Per-field Spanish label, for a name the shared glossary would get wrong in this context. */
  'x-title-es'?: string;
  description?: string;
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  enum?: unknown[];
  format?: string;
  maxLength?: number;
  items?: JsonSchemaNode;
}

/**
 * Words that are ALWAYS shouted, because lowercasing them makes a label look misspelt:
 * `technicalFeasibilityId` should end in «ID», not «Id» and not «id».
 *
 * A list rather than a rule, because there is no rule: `id` is an acronym and `is` is not, and
 * nothing in the spelling separates them. It is short on purpose — a term that is not here comes
 * out as an ordinary word, which is merely plain, whereas a term wrongly here comes out shouting.
 */
const ACRONYMS = new Set([
  'id', 'api', 'url', 'uri', 'cpu', 'gpu', 'ram', 'gb', 'mb', 'tb', 'ms',
  'qa', 'ci', 'cd', 'ui', 'ux', 'db', 'sql', 'http', 'https', 'json', 'xml', 'yaml',
  'sla', 'slo', 'sli', 'kpi', 'okr', 'roi', 'tco', 'rto', 'rpo', 'mttr', 'cfr',
  'prd', 'adr', 'sdlc', 'pii', 'dns', 'tls', 'sso', 'rbac', 'abac', 'vpc',
]);

/**
 * A humane label when the schema gives none: `executiveSummary` → `Executive summary`.
 *
 * SENTENCE case, not Title Case. A form whose labels are Title Cased reads like a menu of
 * commands rather than a set of questions, and it is the house style of the surfaces that render
 * these — mixing the two would look like two systems sharing one screen.
 *
 * This is the fallback. A schema that publishes a `title` has already been given words by whoever
 * owns the shape, and no amount of string-splitting here can improve on them.
 */
function labelEsFor(
  key: string,
  node: JsonSchemaNode,
  labelsEs: Record<string, string> | undefined,
): string | undefined {
  // A schema that names the field itself wins: the glossary is keyed by leaf name, so it says one
  // thing for every `status` in the corpus, and a field whose context makes that wrong needs a way
  // to say so without arguing with the other fifty.
  const own = node['x-title-es'];
  if (own) return own;

  return labelsEs?.[key];
}

function labelFor(key: string, node: JsonSchemaNode): string {
  if (node.title) return node.title;

  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[-_.]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : word.toLowerCase()));

  if (words.length === 0) return '';

  const [first, ...rest] = words;
  const head = ACRONYMS.has(first.toLowerCase())
    ? first
    : first.charAt(0).toUpperCase() + first.slice(1);

  return [head, ...rest].join(' ');
}

/**
 * Maps a JSON Schema node onto the consumer's vocabulary.
 *
 * The vocabulary is deliberately small: it is exactly what the existing criterion operators can
 * judge. A type outside it produces a field no criterion can evaluate, which is the same as no
 * field at all.
 */
function typeFor(node: JsonSchemaNode): ArtifactFieldType | null {
  const raw = Array.isArray(node.type) ? node.type.find((t) => t !== 'null') : node.type;

  if (Array.isArray(node.enum) && node.enum.length > 0) return 'enum';

  switch (raw) {
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'string':
      if (node.format === 'date' || node.format === 'date-time') return 'date';
      if (node.format === 'uri' || node.format === 'url') return 'url';
      // Long free text is still text to a criterion; the distinction is for the editor, which
      // should give it room rather than a single line.
      if ((node.maxLength ?? 0) > 500) return 'rich-text';
      return 'text';
    default:
      return null;
  }
}

/**
 * Walks a JSON Schema and produces the flat field list.
 *
 * Nested objects are flattened with dotted paths because that is how a criterion addresses them.
 * Arrays are omitted and reported — see {@link ArtifactFieldDerivation.omitted}.
 */
export function deriveArtifactFields(
  schema: unknown,
  options: ArtifactFieldDerivationOptions = {},
): ArtifactFieldDerivation {
  const fields: ArtifactField[] = [];
  const omitted: { fieldPath: string; reason: string }[] = [];

  const walk = (
    node: JsonSchemaNode,
    prefix: string,
    requiredHere: Set<string>,
    group?: { label: string; labelEs?: string },
  ): void => {
    const properties = node.properties;
    if (!properties) return;

    for (const [key, child] of Object.entries(properties)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const required = requiredHere.has(key);
      const childType = Array.isArray(child.type)
        ? child.type.find((t) => t !== 'null')
        : child.type;

      if (childType === 'array') {
        omitted.push({
          fieldPath,
          reason: 'collection — no criterion operator can evaluate a list',
        });
        continue;
      }

      if (childType === 'object' && child.properties) {
        // An object is not a field: its LEAVES are. Publishing the container as well would offer
        // a path whose value is a document, which no operator can compare. It IS the section those
        // leaves belong to, though, so its name travels down with them.
        walk(child, fieldPath, new Set(child.required ?? []), {
          label: labelFor(key, child),
          labelEs: labelEsFor(key, child, options.labelsEs),
        });
        continue;
      }

      const type = typeFor(child);
      if (!type) {
        omitted.push({ fieldPath, reason: `unsupported type: ${String(childType ?? 'unknown')}` });
        continue;
      }

      const labelEs = labelEsFor(key, child, options.labelsEs);

      fields.push({
        fieldPath,
        type,
        label: labelFor(key, child),
        ...(labelEs ? { labelEs } : {}),
        ...(group ? { group: group.label } : {}),
        ...(group?.labelEs ? { groupEs: group.labelEs } : {}),
        required,
        ...(type === 'enum' && Array.isArray(child.enum)
          ? { enumValues: child.enum.map((v) => String(v)) }
          : {}),
        ...(child.description ? { description: child.description } : {}),
      });
    }
  };

  const root = (schema ?? {}) as JsonSchemaNode;
  walk(root, '', new Set(root.required ?? []));

  return { fields, omitted };
}

/**
 * Resolves a schema `$id` to the file that publishes it.
 *
 * The `$id` is an identity and the filename is where it lives today; this is the ONE place that
 * knows both, so the rest of the code can keep using the identity. Matching on the last path
 * segment survives the host changing, which is precisely the kind of churn `$id` exists to
 * absorb.
 */
export function schemaFileNameFromId(schemaId: string): string | undefined {
  const trimmed = (schemaId ?? '').trim();
  if (!trimmed) return undefined;
  const last = trimmed.split('/').filter(Boolean).pop();
  return last && last.endsWith('.json') ? last : undefined;
}
