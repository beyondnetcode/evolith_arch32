/**
 * SARIF security-scanner adapters (GT-521 · EAG-24 — IaC/security).
 *
 * Checkov, Trivy and Conftest (and any SARIF 2.1.0 emitter) already normalize their
 * findings to SARIF, so — unlike the architecture analyzers that need a bespoke parser —
 * these reuse the GT-515 {@link ingestSarif} ingester wholesale and only stamp
 * `category = 'security'` on every finding so it routes to the SECURITY dimension instead
 * of the architecture one. Process execution stays behind {@link IProcessRunner} via the
 * GT-514 {@link ShellEnforcerAdapter} seam (hardened by GT-512).
 */

import { makeViolation, type Violation } from '../../../../domain/violation';
import { ingestSarif } from '../sarif-ingester';
import { ShellEnforcerAdapter, type ShellEnforcerConfig } from '../shell-enforcer-adapter';
import type { EnforcerAnalysisContext, IProcessRunner, ProcessResult } from '../enforcer.types';

export const CHECKOV_TOOL = 'Checkov';
export const TRIVY_TOOL = 'Trivy';
export const SECURITY_CATEGORY = 'security';

/**
 * Pure parser: a SARIF 2.1.0 log (from ANY security scanner) → canonical {@link Violation}s
 * tagged `category: 'security'`. Reuses {@link ingestSarif}; malformed/empty input ⇒ `[]`.
 */
export function parseSecuritySarif(stdout: string): Violation[] {
  return ingestSarif(stdout).map((v) => makeViolation({ ...v, category: SECURITY_CATEGORY }));
}

/**
 * A completed scan emits a SARIF log with a `runs` array (even with zero results). Its
 * absence on a non-zero exit is a tool FAILURE (missing binary / bad target) — throw ⇒ the
 * EnforcerEvaluator SKIPs, never a false pass. A non-zero exit WITH a parseable SARIF log
 * is a normal "found findings" run (Checkov/Trivy exit non-zero on findings), not a failure.
 */
export function isSarifToolFailure(result: ProcessResult): boolean {
  let ran = false;
  try {
    const parsed = JSON.parse(result.stdout || '{}');
    ran = Array.isArray(parsed?.runs);
  } catch {
    ran = false;
  }
  return !ran && result.exitCode !== 0;
}

export interface SarifSecurityConfig {
  readonly tool: string;
  readonly runtime: ShellEnforcerConfig['runtime'];
  buildSpec(ctx: EnforcerAnalysisContext): { command: string; args: string[]; cwd?: string };
}

/** Generic factory: a SARIF security scanner → a {@link ShellEnforcerAdapter}. */
export function createSarifSecurityAdapter(runner: IProcessRunner, cfg: SarifSecurityConfig): ShellEnforcerAdapter {
  const config: ShellEnforcerConfig = {
    tool: cfg.tool,
    runtime: cfg.runtime,
    buildSpec: (ctx) => cfg.buildSpec(ctx),
    parse: (result: ProcessResult) => parseSecuritySarif(result.stdout),
    isToolFailure: (result: ProcessResult) => isSarifToolFailure(result),
  };
  return new ShellEnforcerAdapter(config, runner);
}

/** Checkov (IaC misconfiguration scanner) → SARIF on stdout. */
export function createCheckovAdapter(runner: IProcessRunner, options: { directory?: string } = {}): ShellEnforcerAdapter {
  return createSarifSecurityAdapter(runner, {
    tool: CHECKOV_TOOL,
    runtime: 'iac',
    buildSpec: (ctx) => ({
      command: 'checkov',
      args: ['--directory', options.directory ?? '.', '--output', 'sarif', '--compact', '--quiet'],
      cwd: ctx.satellitePath,
    }),
  });
}

/** Trivy (vulnerability + IaC misconfiguration scanner) → SARIF on stdout. */
export function createTrivyAdapter(runner: IProcessRunner, options: { target?: string } = {}): ShellEnforcerAdapter {
  return createSarifSecurityAdapter(runner, {
    tool: TRIVY_TOOL,
    runtime: 'iac',
    buildSpec: (ctx) => ({
      command: 'trivy',
      args: ['config', '--quiet', '--format', 'sarif', options.target ?? '.'],
      cwd: ctx.satellitePath,
    }),
  });
}
