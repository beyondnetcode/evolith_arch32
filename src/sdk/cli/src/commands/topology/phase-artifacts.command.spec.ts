jest.mock('chalk', () => {
  const identity = (str: string) => str;
  return new Proxy(identity, {
    get: (_target, prop) => (prop === '__esModule' ? false : identity),
  });
});

import { PhaseArtifactsCommand } from './phase-artifacts.command';
import { NodeFileSystemProvider } from '../../infrastructure/providers/node-filesystem.provider';
import type { ILogger } from '@beyondnet/evolith-core-domain/domain/interfaces';

/**
 * GT-562 — `topology phase-artifacts` had ZERO coverage. It is advisory, but a
 * gate consumes its verdict, so the branches that decide WHAT IT REPORTS matter:
 *
 *   - an invalid `--phase` must be REFUSED, not quietly measured as something
 *     else (a bogus phase silently scoring 100/100 is the failure mode this
 *     codebase keeps producing);
 *   - a failure in JSON mode must produce an error envelope AND a non-zero exit
 *     code, never a success envelope with empty contents;
 *   - the human and JSON surfaces must agree on the same result.
 *
 * The command runs against the REAL bundled topology corpus via the real
 * filesystem provider, so a test passing here means the shipped corpus is
 * actually readable — not that a mock said so.
 */

const silentLogger: ILogger = {
  log: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
} as unknown as ILogger;

describe('PhaseArtifactsCommand', () => {
  let command: PhaseArtifactsCommand;
  let logSpy: jest.SpyInstance;
  let originalExitCode: typeof process.exitCode;

  function stdout(): string {
    return logSpy.mock.calls.map((c) => String(c[0])).join('\n');
  }

  beforeEach(() => {
    command = new PhaseArtifactsCommand(new NodeFileSystemProvider(), silentLogger);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    jest.restoreAllMocks();
  });

  describe('phase validation', () => {
    it.each([undefined, '', 'design', 'discovery', 'CONSTRUCTION'])(
      'refuses to measure anything for the invalid phase %p',
      async (phase) => {
        await expect(
          command.executeCommand([], { phase: phase as never, topologies: [], declared: [] }),
        ).rejects.toThrow('--phase must be one of: construction, quality, deployment');
      },
    );

    it('reports an invalid phase as an INVALID_PHASE envelope with exit code 1 in JSON mode', async () => {
      // JSON mode must not throw — but it must not look successful either.
      await command.executeCommand([], { phase: 'nope' as never, format: 'json' });

      const envelope = JSON.parse(stdout());
      expect(envelope.error.code).toBe('INVALID_PHASE');
      expect(envelope.success).not.toBe(true);
      expect(process.exitCode).toBe(1);
    });

    it.each(['construction', 'quality', 'deployment'] as const)('accepts the downstream phase %s', async (phase) => {
      await command.executeCommand([], { phase, topologies: [], declared: [], format: 'json' });

      const envelope = JSON.parse(stdout());
      expect(envelope.data.phase).toBe(phase);
      expect(process.exitCode).toBeUndefined();
    });
  });

  describe('measurement', () => {
    it('reports artifacts declared as present and the remainder as missing', async () => {
      await command.executeCommand([], { phase: 'quality', topologies: [], declared: [], format: 'json' });
      const baseline = JSON.parse(stdout()).data;
      // The universal profile must actually require something, or this command
      // would score everything 100/100 and mean nothing.
      expect(baseline.missingArtifacts.length).toBeGreaterThan(0);
      const firstRequired = baseline.missingArtifacts[0];
      logSpy.mockClear();

      await command.executeCommand([], {
        phase: 'quality',
        topologies: [],
        declared: [firstRequired],
        format: 'json',
      });

      const result = JSON.parse(stdout()).data;
      expect(result.presentArtifacts).toContain(firstRequired);
      expect(result.missingArtifacts).not.toContain(firstRequired);
      expect(result.completeness).toBeGreaterThan(baseline.completeness);
    });

    it('scores 100 only when every required artifact is declared', async () => {
      await command.executeCommand([], { phase: 'deployment', topologies: [], declared: [], format: 'json' });
      const required = JSON.parse(stdout()).data.missingArtifacts;
      logSpy.mockClear();

      await command.executeCommand([], {
        phase: 'deployment',
        topologies: [],
        declared: required,
        format: 'json',
      });

      const result = JSON.parse(stdout()).data;
      expect(result.missingArtifacts).toEqual([]);
      expect(result.completeness).toBe(100);
    });

    it('treats an unknown topology as contributing no extra requirements rather than failing', async () => {
      // `catalog.get` returns undefined for an id that is not in the corpus; the
      // optional-chain fallback must degrade to the universal profile only.
      await command.executeCommand([], {
        phase: 'construction',
        topologies: ['no-such-topology'],
        declared: [],
        format: 'json',
      });

      const withUnknown = JSON.parse(stdout()).data;
      logSpy.mockClear();
      await command.executeCommand([], { phase: 'construction', topologies: [], declared: [], format: 'json' });
      const baseline = JSON.parse(stdout()).data;

      expect(withUnknown.missingArtifacts.sort()).toEqual(baseline.missingArtifacts.sort());
    });

    it('defaults topologies and declared to empty when the flags are omitted entirely', async () => {
      await command.executeCommand([], { phase: 'quality', format: 'json' });

      const result = JSON.parse(stdout()).data;
      expect(result.presentArtifacts).toEqual([]);
      expect(result.phase).toBe('quality');
    });
  });

  describe('failure handling', () => {
    it('emits an INTERNAL_ERROR envelope and exit code 1 when the corpus cannot be resolved (JSON)', async () => {
      await command.executeCommand([], {
        phase: 'quality',
        core: '/definitely/not/a/core/checkout',
        format: 'json',
      });

      const envelope = JSON.parse(stdout());
      expect(envelope.error.code).toBe('INTERNAL_ERROR');
      expect(envelope.error.message).toContain('/definitely/not/a/core/checkout');
      expect(process.exitCode).toBe(1);
    });

    it('re-throws in human mode so the base command renders the failure', async () => {
      await expect(
        command.executeCommand([], { phase: 'quality', core: '/definitely/not/a/core/checkout' }),
      ).rejects.toThrow();
    });
  });

  describe('human output', () => {
    it('prints the completeness score and both artifact lists', async () => {
      await command.executeCommand([], { phase: 'quality', topologies: [], declared: [] });

      const out = stdout();
      expect(out).toContain('Phase-Artifact Completeness');
      expect(out).toContain('Completeness:');
      expect(out).toContain('Present:');
      expect(out).toContain('Missing:');
    });

    it('states that the result is advisory, so it is not read as a gate verdict', async () => {
      await command.executeCommand([], { phase: 'quality', topologies: [], declared: [] });

      expect(stdout()).toContain('advisory & non-binding');
    });
  });

  describe('option parsers', () => {
    it('parseTopologies splits a comma list and drops blank entries', () => {
      expect(command['parseTopologies']('microservices, event-driven,,')).toEqual([
        'microservices',
        'event-driven',
      ]);
    });

    it('parseDeclared splits a comma list and trims each entry', () => {
      expect(command['parseDeclared'](' test-summary-report , coverage-report ')).toEqual([
        'test-summary-report',
        'coverage-report',
      ]);
    });

    it.each([
      ['parseCore', '/some/core'],
      ['parsePhase', 'quality'],
      ['parseFormat', 'json'],
    ])('%s returns the value as-is', (method, value) => {
      expect((command as unknown as Record<string, (v: string) => unknown>)[method](value)).toBe(value);
    });
  });
});
