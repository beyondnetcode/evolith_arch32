import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { ValidationIssue } from './ruleset-validator.types';

interface LoadedRule {
  id: string;
  severity: string;
  title: string;
  description: string;
  blocking: boolean;
}

const RULESET_ID_MAP: Record<string, string> = {
  'adr-0002': 'adr/adr-0002-hexagonal-architecture.rules.json',
  'adr-0005': 'adr/adr-0005-cicd-quality-gates.rules.json',
  'adr-0010': 'adr/adr-0010-multi-tenancy.rules.json',
  'adr-0018': 'adr/adr-0018-testing-pyramid.rules.json',
  'adr-0032': 'adr/adr-0032-protocol-selection.rules.json',
  'adr-0040': 'adr/adr-0040-multi-runtime.rules.json',
  'adr-0050': 'adr/adr-0050-gitflow-branching.rules.json',
  'acl': 'acl/anti-corruption-layer.rules.json',
  'open-core': 'governance/open-core-boundary.rules.json',
  'inheritance': 'governance/inheritance.rules.json',
  'cli-release': 'cli/release-readiness.rules.json',
  'cli-parity': 'cli/core-parity.rules.json',
  'evidence': 'evidence/evidence-manifest.rules.json',
  'mcp': 'mcp/protocol-compliance.rules.json',
  'observability': 'observability/telemetry-evidence.rules.json',
};

const AVAILABLE_IDS = Object.keys(RULESET_ID_MAP).join(', ');

export async function loadRulesetById(
  fs: IFileSystem,
  logger: ILogger,
  corePath: string,
  rulesetId: string,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const relativePath = RULESET_ID_MAP[rulesetId.toLowerCase()];
  if (!relativePath) {
    issues.push({
      ruleId: 'UNKNOWN',
      severity: 'SHOULD',
      category: 'governance',
      title: `Unknown ruleset ID: ${rulesetId}`,
      description: `Available ruleset IDs: ${AVAILABLE_IDS}`,
      blocking: false,
    });
    return issues;
  }

  const rules = await loadRulesetFile(fs, logger, corePath, relativePath);
  if (!rules || rules.length === 0) {
    issues.push({
      ruleId: 'MISSING',
      severity: 'MUST',
      category: 'governance',
      title: `Ruleset not found: ${rulesetId}`,
      description: `Could not load ruleset at ${relativePath}`,
      blocking: true,
    });
  }
  return issues;
}

async function loadRulesetFile(
  fs: IFileSystem,
  logger: ILogger,
  corePath: string,
  relativePath: string,
): Promise<LoadedRule[] | null> {
  // GT-456: rulesets may live either directly under `<core>/rulesets` (the
  // rulesets bundled with the CLI package) or under `<core>/src/rulesets` (the
  // Evolith Core monorepo layout). Probe both so a `--core <checkout>` override
  // resolves as well as the bundled default.
  const candidates = [
    path.join(corePath, 'rulesets', relativePath),
    path.join(corePath, 'src', 'rulesets', relativePath),
  ];
  let fullPath: string | undefined;
  for (const candidate of candidates) {
    if (await fs.exists(candidate)) {
      fullPath = candidate;
      break;
    }
  }
  if (!fullPath) return null;
  try {
    const content = await fs.readFile(fullPath);
    const parsed = JSON.parse(content);
    const rules: LoadedRule[] = [];
    if (parsed.principles) {
      for (const p of parsed.principles) {
        rules.push({ id: p.id, severity: p.severity, title: p.principle, description: p.statement, blocking: p.blocking });
      }
    }
    if (parsed.rules) {
      for (const r of parsed.rules) {
        rules.push({ id: r.id, severity: r.severity, title: r.title, description: r.description, blocking: r.blocking });
      }
    }
    return rules;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to load ruleset ${relativePath}: ${message}`);
    return null;
  }
}
