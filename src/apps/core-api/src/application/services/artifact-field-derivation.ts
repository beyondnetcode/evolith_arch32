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
  required: boolean;
  enumValues?: string[];
  description?: string;
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
  description?: string;
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  enum?: unknown[];
  format?: string;
  maxLength?: number;
  items?: JsonSchemaNode;
}

/** A humane label when the schema gives none: `executiveSummary` → `Executive Summary`. */
function labelFor(key: string, node: JsonSchemaNode): string {
  if (node.title) return node.title;
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_.]/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
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
export function deriveArtifactFields(schema: unknown): ArtifactFieldDerivation {
  const fields: ArtifactField[] = [];
  const omitted: { fieldPath: string; reason: string }[] = [];

  const walk = (node: JsonSchemaNode, prefix: string, requiredHere: Set<string>): void => {
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
        // a path whose value is a document, which no operator can compare.
        walk(child, fieldPath, new Set(child.required ?? []));
        continue;
      }

      const type = typeFor(child);
      if (!type) {
        omitted.push({ fieldPath, reason: `unsupported type: ${String(childType ?? 'unknown')}` });
        continue;
      }

      fields.push({
        fieldPath,
        type,
        label: labelFor(key, child),
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
