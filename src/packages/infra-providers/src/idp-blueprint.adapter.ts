import type {
  BlueprintOwnershipRecord,
  OwnershipEntry,
} from '@beyondnet/evolith-core-domain/domain/ownership';
import { parseBlueprintOwnership } from '@beyondnet/evolith-core-domain/domain/ownership';

/**
 * READ-ONLY connector for an IDP blueprint export (Port / Cortex / OpsLevel) (GT-527 · axis 2).
 *
 * This is the thin connector/infra layer: the actual HTTP call to the IDP is INJECTED as a
 * {@link BlueprintHttpClient} so the adapter stays pure of network configuration and is fully
 * unit-testable with a stub. Once the already-normalized {@link BlueprintOwnershipRecord}s are
 * fetched, normalization is delegated to the PURE {@link parseBlueprintOwnership} in
 * `@beyondnet/evolith-core-domain`. No lock-in, no writes — a company's existing source of truth
 * is read as-is.
 */

/** Injected port: fetches the raw, already-normalized ownership records from an IDP blueprint. */
export interface BlueprintHttpClient {
  /** Return the blueprint's ownership records (component|identifier + owner|team + optional path). */
  listEntities(): Promise<BlueprintOwnershipRecord[]>;
}

/**
 * Fetch ownership from an IDP blueprint via the injected {@link BlueprintHttpClient}, then map to
 * the canonical {@link OwnershipEntry}[] with the pure {@link parseBlueprintOwnership} (records
 * lacking a component/owner are dropped; `path` is normalized). `source` tags provenance
 * (`port`, `cortex`, `opslevel`).
 */
export async function fetchBlueprintOwnership(
  client: BlueprintHttpClient,
  source: string,
): Promise<OwnershipEntry[]> {
  const records = await client.listEntities();
  return parseBlueprintOwnership(records, source);
}
