import { IFileSystem } from '../../../../../domain/interfaces';
import { NormalizedRule } from '../../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext } from '../../evaluator.interface';
import { SubResult, PASSED, SKIPPED, asRecord, isPositiveNumber, readJsonConfig } from './shared';

export const CONFIG_CATEGORIES = new Set([
  'serverless-config', 'serverless-stateless', 'serverless-package', 'serverless-cold-start',
  'event-driven-config', 'event-driven-outbox', 'event-driven-dlq',
  'data-mesh-config', 'data-mesh-contracts', 'data-mesh-governance',
  'edge-computing-sync', 'edge-computing-isolation', 'edge-computing-conflict',
]);

/**
 * GT-595 — the four topology flags that fell through on a naming inconsistency.
 *
 * ED-R04/R05/R06 and DAM-R05 are exactly the shape {@link evaluateConfigRule}
 * already reads: a boolean in `<topology>.config.json`. They were never routed
 * because their siblings carry PREFIXED categories (`event-driven-config`,
 * `data-mesh-config`) while these carry BARE ones (`event-ordering`,
 * `idempotency`, `schema-evolution`, `retention`).
 *
 * The dispatch keys on the RULE ID, not the category, and that is deliberate.
 * Two of the bare categories are shared across topologies with DIFFERENT files,
 * DIFFERENT flags and different blocking semantics:
 *
 *   `schema-evolution` : ED-R06  (event-driven.config.json, hasBackwardCompatibleSchema,   blocking)
 *                        DAM-R08 (data-mesh.config.json,    hasBackwardCompatibleContracts, non-blocking)
 *   `retention`        : DAM-R05 (data-mesh.config.json,    hasRetentionPolicy, blocking)
 *                        ED-R07  (event-driven.config.json, hasRetentionPolicy, non-blocking)
 *
 * A category-keyed dispatch would therefore claim DAM-R08 and ED-R07 too, and
 * would read the WRONG config file and the WRONG flag for whichever of the pair
 * it was not written for — a rule reporting a verdict about a file it never
 * opened. `config-rules.spec.ts` pins that mis-claim.
 */
export const TOPOLOGY_FLAG_RULES: Record<string, { file: string; flag: string }> = {
  'ED-R04': { file: 'event-driven.config.json', flag: 'hasOrderingGuarantee' },
  'ED-R05': { file: 'event-driven.config.json', flag: 'hasIdempotencyKey' },
  'ED-R06': { file: 'event-driven.config.json', flag: 'hasBackwardCompatibleSchema' },
  'DAM-R05': { file: 'data-mesh.config.json', flag: 'hasRetentionPolicy' },
};

/**
 * ED-R05 has a SECOND clause its validationQuery states plainly: "AST scan
 * consumer handlers for idempotency guard using a deduplication store (Redis,
 * DB unique key, etc.)". Only the flag clause is implemented. A `passed` that
 * said nothing would be read as the whole rule having been checked, so the
 * verdict carries the caveat with it.
 */
const PARTIAL_CLAUSES: Record<string, string> = {
  'ED-R05': 'flag clause only — the second clause (AST scan of consumer handlers for a deduplication guard) is NOT implemented',
};

export function isTopologyFlagRule(rule: NormalizedRule): boolean {
  return Object.prototype.hasOwnProperty.call(TOPOLOGY_FLAG_RULES, rule.id);
}

export async function evaluateTopologyFlagRule(rule: NormalizedRule, ctx: WorkspaceEvaluationContext, fs: IFileSystem): Promise<SubResult> {
  const spec = TOPOLOGY_FLAG_RULES[rule.id];
  if (!spec) return SKIPPED;

  const config = await readJsonConfig(fs, ctx.satellitePath, spec.file);
  if (!config) {
    return { result: 'failed', message: `${rule.id}: ${spec.file} is missing, so ${spec.flag} cannot be declared` };
  }
  if (config[spec.flag] !== true) {
    return { result: 'failed', message: `${rule.id}: ${spec.file} does not declare ${spec.flag}=true (found ${JSON.stringify(config[spec.flag])})` };
  }

  const caveat = PARTIAL_CLAUSES[rule.id];
  return caveat ? { result: 'passed', message: `${rule.id}: ${spec.flag}=true in ${spec.file} — ${caveat}` } : PASSED;
}

export async function evaluateConfigRule(rule: NormalizedRule, ctx: WorkspaceEvaluationContext, fs: IFileSystem): Promise<SubResult> {
  const sat = ctx.satellitePath;
  const fail = (file: string): SubResult => ({ result: 'failed', message: `${rule.description} - ${file} does not satisfy ${rule.id}` });

  switch (rule.category) {
    case 'serverless-config':
    case 'serverless-stateless':
    case 'serverless-package':
    case 'serverless-cold-start': {
      const config = await readJsonConfig(fs, sat, 'serverless.config.json');
      const pkg = asRecord(config?.package);
      const coldStart = asRecord(config?.coldStart);
      const valid = rule.category === 'serverless-config' ? Boolean(config)
        : rule.category === 'serverless-stateless' ? config?.stateless === true
        : rule.category === 'serverless-package' ? isPositiveNumber(pkg?.maxSizeMb) && (pkg?.maxSizeMb as number) <= 50
        : isPositiveNumber(coldStart?.maxInitMilliseconds) && coldStart?.lazyInitialization === true;
      return valid ? PASSED : fail('serverless.config.json');
    }

    case 'event-driven-config':
    case 'event-driven-outbox':
    case 'event-driven-dlq': {
      const config = await readJsonConfig(fs, sat, 'event-driven.config.json');
      const valid = rule.category === 'event-driven-config' ? config?.strictAsyncApi === true
        : rule.category === 'event-driven-outbox' ? config?.transactionalOutbox === true
        : config?.deadLetterQueue === true;
      return valid ? PASSED : fail('event-driven.config.json');
    }

    case 'data-mesh-config':
    case 'data-mesh-contracts':
    case 'data-mesh-governance': {
      const config = await readJsonConfig(fs, sat, 'data-mesh.config.json');
      const valid = rule.category === 'data-mesh-config' ? config?.isDataProduct === true
        : rule.category === 'data-mesh-contracts' ? config?.hasDataContracts === true
        : config?.federatedGovernance === true;
      return valid ? PASSED : fail('data-mesh.config.json');
    }

    case 'edge-computing-sync':
    case 'edge-computing-isolation':
    case 'edge-computing-conflict': {
      const config = await readJsonConfig(fs, sat, 'edge-computing.config.json');
      const valid = rule.category === 'edge-computing-sync' ? ['offline-first', 'eventual', 'real-time-fallback'].includes(config?.syncStrategy as string)
        : rule.category === 'edge-computing-isolation' ? config?.edgeIsolation === true
        : ['last-write-wins', 'merge', 'manual'].includes(config?.conflictResolution as string);
      return valid ? PASSED : fail('edge-computing.config.json');
    }

    default:
      return SKIPPED;
  }
}
