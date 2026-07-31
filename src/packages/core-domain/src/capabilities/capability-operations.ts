/**
 * Per-operation input/output schemas for the capability manifest (GT-583).
 *
 * ## The shape this replaces
 *
 * Before this module the same contract was written down three times: the CLI's
 * `TOOL_SCHEMAS` map (`src/sdk/cli/src/commands/api/api.catalog.ts`), the
 * `inputSchema` literal inside every MCP tool file, and — in the capability
 * manifest — not at all. "One registry generates the three surfaces" was prose.
 * The evidence that it was only prose: the hand-written CLI map held THREE
 * entries against fifty registered tools, keyed `gate-evaluate` while the tool
 * is called `evolith-gate-evaluate`, and one of its three keys (`agent-create`)
 * names an operation that does not exist. Every `evolith api --inspect` of a
 * real tool answered "not found" while the catalog claimed to describe the MCP
 * surface. That is GT-485 / GT-564 divergence, already shipped.
 *
 * ## Where the truth lives now
 *
 * `ToolRegistryService.operationProjection()` — the registry that the MCP server
 * actually answers `tools/list` from, asked to describe itself. The generator
 * `.harness/scripts/generate-capability-operations.mjs` CALLS that function
 * (through `ts-node`, against the TypeScript source, exactly as GT-602's ABAC
 * generator calls `AbacEvaluator.toolProjection()`) and writes
 * {@link CAPABILITY_OPERATIONS}. `buildCapabilityManifest` publishes it, and the
 * CLI catalog is generated from the manifest. One authoring site, three derived
 * surfaces, one `--check` guard.
 *
 * The projection is read from `listSchemas()`, NOT from the `tools/list` wire
 * response: `handleListTools` filters the inventory by the ambient principal's
 * scopes (GT-609), so a generator fed from the wire would silently emit whatever
 * subset the generating principal happened to be allowed to see. That is the
 * GT-602 trap — a generator fed from the wrong source deleted nine tools — in
 * its MCP form.
 */

import { sha256Hex } from './capability-fingerprint';

/**
 * Meta-schema every operation schema declares. The MCP specification (SEP-2106)
 * expects 2020-12 keywords in tool schemas; `buildToolOutputSchema` in the MCP
 * server already stamps this dialect on the output side.
 *
 * NOTE — deliberately scoped: this is the dialect of the OPERATION schemas
 * generated here. The 154 `src/rulesets/**\/*.schema.json` ruleset files still
 * declare draft-07 and are NOT migrated by GT-583; see the gap report.
 */
export const OPERATION_SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema' as const;

/** A JSON Schema object as carried by an operation descriptor. */
export type OperationJsonSchema = Readonly<Record<string, unknown>>;

/**
 * One governed operation, with the schemas a consumer needs to call it without
 * reading any surface's source.
 */
export interface CapabilityOperation {
  /** Canonical operation name (the MCP tool name, e.g. `evolith-gate-evaluate`). */
  readonly name: string;
  readonly description: string;
  /** Surfaces that expose this operation. */
  readonly surfaces: readonly string[];
  /** True when the operation may change the working tree. */
  readonly mutative: boolean;
  /** Authorization scope required to execute it. */
  readonly scope: 'read' | 'write' | 'admin';
  /** JSON Schema 2020-12 of the accepted arguments. */
  readonly inputSchema: OperationJsonSchema;
  /** JSON Schema 2020-12 of the returned envelope. */
  readonly outputSchema: OperationJsonSchema;
}

/**
 * Fingerprint of an operation set: sha256 of its canonical, key-sorted JSON.
 *
 * The manifest publishes this as `operationsSha256` so a consumer (and the
 * `@beyondnet/evolith-contracts` snapshot) can pin the whole per-operation
 * contract with ONE scalar instead of embedding fifty schemas.
 */
export function capabilityOperationsFingerprint(
  operations: readonly CapabilityOperation[],
): string {
  return sha256Hex(operations);
}

/**
 * Structural validity of a generated catalog. Used by the drift guard and by
 * the domain spec so an EMPTY or malformed catalog can never be published as if
 * it were a real one — the anti-vacuous check GT-602 learned to write.
 */
export function checkCapabilityOperations(
  operations: readonly CapabilityOperation[],
): readonly string[] {
  const problems: string[] = [];
  if (operations.length === 0) {
    problems.push('the operation catalog is EMPTY — a manifest with no operations advertises nothing.');
    return problems;
  }
  const seen = new Set<string>();
  for (const op of operations) {
    if (!op.name) problems.push('an operation has no name.');
    if (seen.has(op.name)) problems.push(`duplicate operation: ${op.name}`);
    seen.add(op.name);
    if (!op.description) problems.push(`${op.name}: no description.`);
    if (op.surfaces.length === 0) problems.push(`${op.name}: exposed on no surface.`);
    for (const side of ['inputSchema', 'outputSchema'] as const) {
      const schema = op[side] as Record<string, unknown>;
      if (!schema || typeof schema !== 'object') {
        problems.push(`${op.name}: ${side} is not an object.`);
        continue;
      }
      if (schema.$schema !== OPERATION_SCHEMA_DIALECT) {
        problems.push(
          `${op.name}: ${side} declares dialect ${String(schema.$schema)}, expected ${OPERATION_SCHEMA_DIALECT}.`,
        );
      }
      if (schema.type !== 'object') {
        problems.push(`${op.name}: ${side} is not an object schema.`);
      }
    }
  }
  return problems;
}
