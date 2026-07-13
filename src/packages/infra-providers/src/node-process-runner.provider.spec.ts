import type { ProcessSpec } from '@beyondnet/evolith-core-domain';

import { NodeProcessRunner } from './node-process-runner.provider';

/** Run `node -e <script>` — a real, cross-platform subprocess available in every CI. */
const nodeEval = (script: string, extra: Partial<ProcessSpec> = {}): ProcessSpec => ({
  command: process.execPath,
  args: ['-e', script],
  ...extra,
});

describe('NodeProcessRunner (GT-512 · EAG-04 — real child_process adapter)', () => {
  const runner = new NodeProcessRunner();

  it('runs a command with no shell and captures stdout + a zero exit', async () => {
    const result = await runner.run(nodeEval('process.stdout.write("hello")'));
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('hello');
    expect(result.timedOut).toBe(false);
  });

  it('surfaces a non-zero exit code as data (does not throw)', async () => {
    const result = await runner.run(nodeEval('process.exit(3)'));
    expect(result.exitCode).toBe(3);
  });

  it('captures stderr', async () => {
    const result = await runner.run(nodeEval('process.stderr.write("oops")'));
    expect(result.stderr).toBe('oops');
  });

  it('does NOT inherit ambient secrets from the parent env', async () => {
    process.env.EVOLITH_TEST_SECRET_TOKEN = 'leaked';
    try {
      const result = await runner.run(nodeEval('process.stdout.write(String(process.env.EVOLITH_TEST_SECRET_TOKEN))'));
      expect(result.stdout).toBe('undefined'); // the secret never reached the child
    } finally {
      delete process.env.EVOLITH_TEST_SECRET_TOKEN;
    }
  });

  it('forwards the explicit spec env (so tools still get what they need)', async () => {
    const result = await runner.run(nodeEval('process.stdout.write(String(process.env.FOO))', { env: { FOO: 'bar' } }));
    expect(result.stdout).toBe('bar');
  });

  it('kills a process that exceeds its timeout and flags timedOut', async () => {
    const result = await runner.run(nodeEval('setTimeout(() => {}, 10000)', { timeoutMs: 200 }));
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(124);
  });

  it('reports a spawn failure (unknown binary) as a non-zero exit, not a throw', async () => {
    const result = await runner.run({ command: 'evolith-definitely-not-a-real-binary-xyz', args: [] });
    expect(result.exitCode).toBe(127);
  });

  it('runs in the given cwd', async () => {
    const result = await runner.run(nodeEval('process.stdout.write(process.cwd())', { cwd: process.cwd() }));
    expect(result.stdout).toBe(process.cwd());
  });
});
