import * as path from 'path';
import { IFileSystem } from '../../../../../domain/interfaces';
import { NormalizedRule } from '../../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext } from '../../evaluator.interface';
import { SubResult, PASSED, SKIPPED } from './shared';

export const STRUCTURAL_CATEGORIES = new Set([
  'topology', 'bounded-contexts', 'hexagonal-architecture', 'communication', 'persistence',
  'async-boundaries', 'extraction-readiness', 'observability', 'module-autonomy',
  'contract-stability', 'data-ownership', 'async-communication', 'distributed-tracing',
  'containerization', 'service-boundaries',
]);

export async function evaluateStructuralRule(rule: NormalizedRule, ctx: WorkspaceEvaluationContext, fs: IFileSystem): Promise<SubResult> {
  const sat = ctx.satellitePath;
  const fail = (reason: string): SubResult => ({ result: 'failed', message: `${rule.description} - ${reason}` });

  switch (rule.category) {
    case 'topology':
      if (rule.id === 'MM-R01') {
        const packageJsonPath = path.join(sat, 'package.json');
        if (await fs.exists(packageJsonPath)) {
          const pkg = await fs.readJson(packageJsonPath) as { workspaces?: unknown };
          if (pkg.workspaces) return fail('Monorepo workspace detected');
        }
      }
      return PASSED;

    case 'bounded-contexts':
      if (rule.id === 'MM-R02') {
        const srcPath = path.join(sat, 'src');
        if (await fs.exists(srcPath)) {
          const entries = await fs.readdirNames(srcPath);
          const moduleCount = entries.filter(e => !e.startsWith('.')).length;
          if (moduleCount < 2) return fail(`Found only ${moduleCount} module(s) in src/`);
        }
      }
      return PASSED;

    case 'hexagonal-architecture':
      if (rule.id === 'MM-R03') {
        const srcPath = path.join(sat, 'src');
        const hasPorts = await fs.exists(path.join(srcPath, 'ports')) ||
                         await fs.exists(path.join(srcPath, 'Ports')) ||
                         await fs.exists(path.join(srcPath, 'application/ports'));
        if (!hasPorts) return fail('No ports directory found (expected: src/ports or src/application/ports)');
      }
      return PASSED;

    case 'communication':
      if (rule.id === 'MM-R04' || rule.id === 'DM-R03') {
        const contractsPath = path.join(sat, 'contracts');
        if (!await fs.exists(contractsPath)) return fail('No contracts/ directory found for inter-module contracts');
      }
      return PASSED;

    case 'persistence':
      if (rule.id === 'MM-R05') {
        const aclPath = path.join(sat, 'acl');
        if (!await fs.exists(aclPath)) {
          return fail('No acl/ directory found (should contain one subdirectory per bounded context)');
        }
        const entries = await fs.readdirNames(aclPath);
        if (entries.length < 2) return fail(`Found ${entries.length} bounded context(s) in acl/ (expected multiple)`);
      }
      return PASSED;

    case 'async-boundaries':
      if (rule.id === 'MM-R06') {
        const eventsPath = path.join(sat, 'events') ||
                           path.join(sat, 'src', 'events') ||
                           path.join(sat, 'src', 'domain', 'events');
        if (!await fs.exists(eventsPath)) return fail('No events directory found');
      }
      return PASSED;

    case 'extraction-readiness':
      if (rule.id === 'MM-R07') {
        const p = path.join(sat, 'docs', 'extraction-readiness.md');
        if (!await fs.exists(p)) return fail('No extraction-readiness.md found in docs/');
      }
      return PASSED;

    case 'observability':
      if (rule.id === 'MM-R08') {
        if (await fs.exists(path.join(sat, 'package.json'))) {
          const otelConfigPath = path.join(sat, 'otel.config.js') ||
                                path.join(sat, 'opentelemetry.config.js') ||
                                path.join(sat, 'src', 'instrumentation.ts');
          if (!await fs.exists(otelConfigPath)) return fail('No OpenTelemetry instrumentation found');
        }
      }
      return PASSED;

    case 'module-autonomy':
      if (rule.id === 'DM-R01') {
        const srcPath = path.join(sat, 'src');
        if (await fs.exists(srcPath)) {
          const entries = await fs.readdirNames(srcPath);
          let hasIndependentModules = false;
          for (const entry of entries) {
            if (await fs.exists(path.join(srcPath, entry, 'package.json'))) { hasIndependentModules = true; break; }
          }
          if (!hasIndependentModules && entries.length > 1) return fail('No independent module package.json files found');
        }
      }
      return PASSED;

    case 'contract-stability':
      if (rule.id === 'DM-R02') {
        const contractsPath = path.join(sat, 'contracts');
        if (!await fs.exists(contractsPath)) return fail('No contracts directory found');
        const contractFiles = (await fs.readdirNames(contractsPath)).filter(f =>
          f.endsWith('.proto') || f.endsWith('.avsc') || f.endsWith('.json')
        );
        if (contractFiles.length === 0) return fail('No contract definition files (.proto, .avsc, .json schema) found');
      }
      return PASSED;

    case 'data-ownership':
      if (rule.id === 'DM-R03') {
        const aclPath = path.join(sat, 'acl');
        if (!await fs.exists(aclPath)) return fail('No acl directory for data ownership enforcement');
      }
      return PASSED;

    case 'async-communication':
      if (rule.id === 'DM-R04') {
        const eventsPath = path.join(sat, 'events') || path.join(sat, 'src', 'events');
        if (await fs.exists(eventsPath)) {
          const eventFiles = (await fs.readdirNames(eventsPath)).filter(f => f.endsWith('.json') || f.endsWith('.schema.json'));
          if (eventFiles.length === 0) return fail('No schema-validated event files found');
        }
      }
      return PASSED;

    case 'distributed-tracing': {
      const tracerSetupFiles = [
        path.join(sat, 'src', 'tracing.ts'),
        path.join(sat, 'src', 'instrumentation.ts'),
        path.join(sat, 'opentelemetry.config.js'),
      ];
      const existsResults = await Promise.all(tracerSetupFiles.map(f => fs.exists(f)));
      if (!existsResults.some(Boolean)) return fail('No distributed tracing setup found');
      return PASSED;
    }

    case 'containerization':
      if (rule.id === 'MS-R01') {
        const dockerfilePath = path.join(sat, 'Dockerfile');
        if (!await fs.exists(dockerfilePath)) return fail('No Dockerfile found at repository root');
      }
      return PASSED;

    case 'service-boundaries':
      if (rule.id === 'MS-R02') {
        const srcPath = path.join(sat, 'src');
        if (await fs.exists(srcPath)) {
          const entries = await fs.readdirNames(srcPath);
          const dirEntries: string[] = [];
          for (const entry of entries) {
            const stat = await fs.stat(path.join(srcPath, entry));
            if (stat.isDirectory()) dirEntries.push(entry);
          }
          if (dirEntries.length < 2) return fail(`Only ${dirEntries.length} service(s) found (expected multiple independent services)`);
        }
      }
      return PASSED;

    default:
      return SKIPPED;
  }
}
