import {
  buildNetArchTestSpec,
  createNetArchTestAdapter,
  isNetArchTestFailure,
  parseNetArchTestReport,
} from './netarchtest-adapter';
import { StubProcessRunner } from '../enforcer.types';

const RUN_WITH_FAILURES = [
  'Determining projects to restore...',
  '  Restored /w/tests/Arch.Tests.csproj (in 1.2 sec).',
  '',
  '  Failed MyApp.Arch.Tests.Domain_should_not_depend_on_Infrastructure [45 ms]',
  '  Error Message:',
  '   NetArchTest: expected no dependencies but found MyApp.Domain.Order -> MyApp.Infrastructure.Db',
  '  Stack Trace:',
  '     at MyApp.Arch.Tests.ArchitectureTests.Domain_should_not_depend_on_Infrastructure()',
  '',
  '  Failed MyApp.Arch.Tests.Controllers_should_have_Controller_suffix [12 ms]',
  '  Error Message:',
  '   NetArchTest failing types: MyApp.Api.OrdersEndpoint',
  '',
  'Failed!  - Failed:     2, Passed:     8, Skipped:     0, Total:    10, Duration: 1 s',
].join('\n');

const CLEAN_RUN = [
  '  Restored /w/tests/Arch.Tests.csproj (in 0.9 sec).',
  'Passed!  - Failed:     0, Passed:    10, Skipped:     0, Total:    10, Duration: 1 s',
].join('\n');

const BUILD_BROKE = [
  'Determining projects to restore...',
  '/w/src/Domain/Order.cs(14,9): error CS0246: The type or namespace name \'Foo\' could not be found',
  'Build FAILED.',
].join('\n');

describe('parseNetArchTestReport (GT-524 AC1 — .NET arch failures → Violation)', () => {
  it('maps each failed architecture test to a Violation with tool, ruleId, error severity, fingerprint', () => {
    const out = parseNetArchTestReport(RUN_WITH_FAILURES);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      tool: 'NetArchTest',
      ruleId: 'MyApp.Arch.Tests.Domain_should_not_depend_on_Infrastructure',
      file: '',
      severity: 'error',
    });
    expect(out[0].fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });

  it('captures the Error Message block (the failing types) into the message', () => {
    const out = parseNetArchTestReport(RUN_WITH_FAILURES);
    expect(out[0].message).toContain('MyApp.Domain.Order -> MyApp.Infrastructure.Db');
    expect(out[1].message).toContain('MyApp.Api.OrdersEndpoint');
  });

  it('gives distinct fingerprints per rule despite the shared empty file', () => {
    const out = parseNetArchTestReport(RUN_WITH_FAILURES);
    expect(out[0].fingerprint).not.toBe(out[1].fingerprint);
  });

  it('never mis-parses the summary line as a violation', () => {
    const out = parseNetArchTestReport(RUN_WITH_FAILURES);
    expect(out.map((v) => v.ruleId)).not.toContain('Failed!');
  });

  it('returns [] for a clean run or malformed/empty input (zero false positives — AC2 parser side)', () => {
    expect(parseNetArchTestReport(CLEAN_RUN)).toEqual([]);
    expect(parseNetArchTestReport('')).toEqual([]);
    expect(parseNetArchTestReport('not dotnet output')).toEqual([]);
  });
});

describe('isNetArchTestFailure (a completed run ≠ a build break)', () => {
  it('is false for a clean pass and for a run that found failures (both are real runs)', () => {
    expect(isNetArchTestFailure({ exitCode: 0, stdout: CLEAN_RUN, stderr: '' })).toBe(false);
    expect(isNetArchTestFailure({ exitCode: 1, stdout: RUN_WITH_FAILURES, stderr: '' })).toBe(false);
  });

  it('is true for a build/restore break (must SKIP, never a false pass)', () => {
    expect(isNetArchTestFailure({ exitCode: 1, stdout: BUILD_BROKE, stderr: '' })).toBe(true);
    expect(isNetArchTestFailure({ exitCode: 1, stdout: '', stderr: 'crash' })).toBe(true);
  });
});

describe('createNetArchTestAdapter (reuses the GT-514 ShellEnforcerAdapter seam)', () => {
  it('builds a `dotnet test` invocation with the architecture filter + console logger', () => {
    const spec = buildNetArchTestSpec({ satellitePath: '/w', corePath: '/c', rules: [] }, { project: 'tests/Arch.Tests.csproj' });
    expect(spec.command).toBe('dotnet');
    expect(spec.args).toEqual([
      'test', 'tests/Arch.Tests.csproj', '--nologo', '--verbosity', 'quiet',
      '--filter', 'Category=Architecture', '--logger', 'console;verbosity=normal',
    ]);
    expect(spec.cwd).toBe('/w');
  });

  it('omits the filter when explicitly disabled with `filter: null`', () => {
    const spec = buildNetArchTestSpec({ satellitePath: '/w', corePath: '/c', rules: [] }, { filter: null });
    expect(spec.args).not.toContain('--filter');
  });

  it('runs through the injected runner and returns parsed violations', async () => {
    const adapter = createNetArchTestAdapter(new StubProcessRunner({ exitCode: 1, stdout: RUN_WITH_FAILURES, stderr: '' }));
    const out = await adapter.analyze({ satellitePath: '/w', corePath: '/c', rules: [] });
    expect(adapter.tool).toBe('NetArchTest');
    expect(adapter.runtime).toBe('dotnet');
    expect(out).toHaveLength(2);
  });

  it('SKIPs (throws) on a build break rather than reporting a false pass', async () => {
    const adapter = createNetArchTestAdapter(new StubProcessRunner({ exitCode: 1, stdout: BUILD_BROKE, stderr: '' }));
    await expect(adapter.analyze({ satellitePath: '/w', corePath: '/c', rules: [] })).rejects.toThrow(/NetArchTest/);
  });
});
