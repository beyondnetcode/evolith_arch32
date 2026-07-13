/**
 * Generic SARIF 2.1.0 ingester (GT-515 · EAG-09).
 *
 * Tool-agnostic: maps any SARIF 2.1.0 log's `runs[].results[]` into canonical
 * {@link Violation}s, reading the producing tool from `run.tool.driver.name`. It is
 * NOT dependency-cruiser-specific (depcruise has no SARIF ≤v16 and uses its own JSON
 * parser) — this ingester serves any SARIF-emitting analyzer and is reused by the
 * security tools in GT-521.
 */

import { makeViolation, type Violation, type ViolationSeverity } from '../../../domain/violation';

/** SARIF result levels → canonical severity (SARIF default when omitted is `warning`). */
const SARIF_LEVEL: Readonly<Record<string, ViolationSeverity>> = {
  error: 'error',
  warning: 'warning',
  note: 'info',
  none: 'info',
};

// Minimal SARIF 2.1.0 shapes (only the fields we read).
interface SarifArtifactLocation { readonly uri?: string }
interface SarifRegion { readonly startLine?: number; readonly startColumn?: number }
interface SarifPhysicalLocation { readonly artifactLocation?: SarifArtifactLocation; readonly region?: SarifRegion }
interface SarifLocation { readonly physicalLocation?: SarifPhysicalLocation }
interface SarifResult {
  readonly ruleId?: string;
  readonly rule?: { readonly id?: string };
  readonly level?: string;
  readonly message?: { readonly text?: string };
  readonly locations?: readonly SarifLocation[];
}
interface SarifRun {
  readonly tool?: { readonly driver?: { readonly name?: string } };
  readonly results?: readonly SarifResult[];
}
export interface SarifLog {
  readonly version?: string;
  readonly runs?: readonly SarifRun[];
}

/** Map a single SARIF result level to canonical severity (default `warning`). */
export function sarifLevelToSeverity(level: string | undefined): ViolationSeverity {
  return (level && SARIF_LEVEL[level]) || 'warning';
}

/**
 * Ingest a SARIF 2.1.0 log into canonical {@link Violation}s. Each result becomes one
 * violation (per its first physical location). Missing/empty input yields `[]`.
 */
export function ingestSarif(log: SarifLog | string): Violation[] {
  let parsed: SarifLog;
  if (typeof log === 'string') {
    try {
      parsed = JSON.parse(log || '{}');
    } catch {
      return [];
    }
  } else {
    parsed = log ?? {};
  }

  const out: Violation[] = [];
  for (const run of parsed.runs ?? []) {
    const tool = run.tool?.driver?.name ?? 'sarif';
    for (const result of run.results ?? []) {
      const ruleId = result.ruleId ?? result.rule?.id;
      if (!ruleId) continue; // a SARIF result without a rule id cannot normalize
      const physical = result.locations?.[0]?.physicalLocation;
      const file = physical?.artifactLocation?.uri ?? '';
      const region = physical?.region;
      out.push(
        makeViolation({
          ruleId,
          tool,
          file,
          line: region?.startLine,
          column: region?.startColumn,
          severity: sarifLevelToSeverity(result.level),
          message: result.message?.text ?? '',
        }),
      );
    }
  }
  return out;
}
