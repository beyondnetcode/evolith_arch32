import * as yaml from 'yaml';
import type { BackstageEntity, OwnershipEntry } from '@beyondnet/evolith-core-domain/domain/ownership';
import { parseBackstageCatalog } from '@beyondnet/evolith-core-domain/domain/ownership';

/**
 * READ-ONLY loader for a Backstage `catalog-info.yaml` file (GT-527 · axis 2).
 *
 * This is the thin connector/infra layer: it parses the YAML *text* (possibly a multi-document
 * stream separated by `---`) into {@link BackstageEntity} objects, then delegates to the PURE
 * {@link parseBackstageCatalog} in `@beyondnet/evolith-core-domain` for normalization. No lock-in,
 * no writes — a company's existing source of truth is read as-is.
 *
 * Multi-document handling is delegated to the `yaml` package's `parseAllDocuments`, which splits
 * on `---` correctly (including `---` that appears inside block scalars/strings). Empty or
 * comment-only documents are skipped; non-object documents are ignored.
 */
export function loadBackstageOwnership(yamlText: string): OwnershipEntry[] {
  const documents = yaml.parseAllDocuments(yamlText);
  const entities: BackstageEntity[] = [];
  for (const doc of documents) {
    const value = doc.toJSON() as unknown;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      entities.push(value as BackstageEntity);
    }
  }
  return parseBackstageCatalog(entities);
}
