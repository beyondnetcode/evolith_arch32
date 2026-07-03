/**
 * OpaCliPolicyValidationAdapter — REAL {@link IPolicyValidationPort} that shells
 * out to the OPA binary bundled in `.harness/bin/opa` (the same engine CI uses).
 *
 * It evaluates a query (default `data.<policyRef>.allow`) against the supplied
 * input document over a policy bundle directory, parses OPA's JSON result, and
 * maps it to a {@link PolicyValidationResult}. Thin on purpose: the policies
 * themselves live in `rulesets/opa/` and stay governed by the Core.
 */

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import type {
  IPolicyValidationPort,
  PolicyValidationRequest,
  PolicyValidationResult,
} from '../../domain/ports/policy-validation.port';

export interface OpaCliOptions {
  /** Path to the opa binary (default '.harness/bin/opa' under cwd). */
  readonly opaPath?: string;
  /** Directory holding the rego policy bundle (default 'rulesets/opa'). */
  readonly policyDir?: string;
  readonly cwd?: string;
  readonly timeoutMs?: number;
}

export class OpaCliPolicyValidationAdapter implements IPolicyValidationPort {
  private readonly opaPath: string;
  private readonly policyDir: string;
  private readonly cwd: string;
  private readonly timeoutMs: number;

  constructor(options: OpaCliOptions = {}) {
    this.cwd = options.cwd ?? process.cwd();
    this.opaPath = options.opaPath ?? join(this.cwd, '.harness/bin/opa');
    this.policyDir = options.policyDir ?? join(this.cwd, 'rulesets/opa');
    this.timeoutMs = options.timeoutMs ?? 60_000;
  }

  async validate(request: PolicyValidationRequest): Promise<PolicyValidationResult> {
    const pkg = request.policyRef ?? 'evolith.gates.default';
    const query = `data.${pkg}.allow`;
    const args = ['eval', '--format', 'json', '--ignore', 'schemas', '-I', '-d', this.policyDir, query];

    const out = await this.run(args, JSON.stringify(request.input));
    if (!out.ok) {
      // Fail-closed: an OPA execution error is a policy violation, not a silent pass.
      return {
        allowed: false,
        engine: 'opa',
        policyRef: pkg,
        violations: [
          { ruleId: 'opa.execution_error', message: out.error ?? 'opa failed', severity: 'error' },
        ],
      };
    }

    const allowed = this.readAllow(out.stdout);
    return {
      allowed,
      engine: 'opa',
      policyRef: pkg,
      violations: allowed
        ? []
        : [{ ruleId: `${pkg}.allow`, message: 'OPA policy denied the request.', severity: 'error' }],
    };
  }

  private readAllow(stdout: string): boolean {
    try {
      const json = JSON.parse(stdout) as {
        result?: Array<{ expressions?: Array<{ value?: unknown }> }>;
      };
      const value = json.result?.[0]?.expressions?.[0]?.value;
      return value === true;
    } catch {
      return false;
    }
  }

  private run(
    args: string[],
    stdin: string,
  ): Promise<{ ok: boolean; stdout: string; error?: string }> {
    return new Promise((resolve) => {
      const child = spawn(this.opaPath, args, { cwd: this.cwd });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => child.kill('SIGKILL'), this.timeoutMs);
      child.stdout?.on('data', (d) => (stdout += d.toString()));
      child.stderr?.on('data', (d) => (stderr += d.toString()));
      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({ ok: false, stdout, error: String(err) });
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ ok: code === 0, stdout, error: code === 0 ? undefined : stderr });
      });
      child.stdin?.write(stdin);
      child.stdin?.end();
    });
  }
}
