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
