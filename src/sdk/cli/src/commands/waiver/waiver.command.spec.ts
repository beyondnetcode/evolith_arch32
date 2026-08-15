import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WaiverCommand } from './waiver.command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';

/**
 * GT-562 — the `waiver` command had ZERO tests, which is the worst place in the
 * CLI for a blind spot: a waiver SUPPRESSES a blocking finding. Every branch
 * here is a governance decision —
 *
 *   - approving something that was never requested,
 *   - approving the wrong VERSION when several exist,
 *   - an expired waiver still reading as approved,
 *   - a required audit flag (`--reason`, `--by`, `--expires`) silently missing,
 *   - an unknown action being treated as the harmless `list` default,
 *
 * every one of which fails OPEN (a violation stops blocking) if it regresses.
 *
 * These tests drive the REAL file-backed store in a temp dir, because durability
 * across invocations is the whole point of the command: a waiver approved by one
 * process must be the waiver a later `evaluate --format drift` reads.
 */

function buildPromptService(): PromptService {
  return new PromptService();
}

/**
 * GT-677 — the command now resolves its store against the WORKSPACE, whose default is
 * the profile's satellite. A real {@link ConfigService} here would read the developer's
 * own profile and write the test's waivers into their satellite; the stub keeps every
 * case anchored on the temp dir.
 */
function buildConfigService(profile: Record<string, unknown> = {}): ConfigService {
  return { getProfile: () => profile } as unknown as ConfigService;
}

const FUTURE = '2099-01-01T00:00:00.000Z';
const PAST = '2000-01-01T00:00:00.000Z';

describe('WaiverCommand', () => {
  let command: WaiverCommand;
  let workdir: string;
  let storePath: string;
  let logSpy: jest.SpyInstance;
  let cwdSpy: jest.SpyInstance;

  /** Everything the store wrote, parsed back from disk. */
  function readStore(): Array<Record<string, unknown>> {
    return JSON.parse(readFileSync(storePath, 'utf8'));
  }

  /** Write a store file directly, creating its directory — used to seed states
   *  (expired, rejected, corrupt) the command itself cannot produce. */
  function seedStore(contents: string, file = storePath): void {
    mkdirSync(join(workdir, '.evolith'), { recursive: true });
    writeFileSync(file, contents, 'utf8');
  }

  /** Concatenated stdout for assertions on human output. */
  function stdout(): string {
    return logSpy.mock.calls.map((c) => String(c[0])).join('\n');
  }

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'evolith-waiver-'));
    storePath = join(workdir, '.evolith', 'waivers.json');
    // The command resolves its store relative to cwd; pin it to the temp dir.
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(workdir);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    command = new WaiverCommand(buildPromptService(), buildConfigService());
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    logSpy.mockRestore();
    rmSync(workdir, { recursive: true, force: true });
  });

  describe('request', () => {
    it('persists a version-1 requested waiver bound to the fingerprint it suppresses', async () => {
      await command.executeCommand(['request'], {
        ref: 'W-1',
        fingerprint: 'fp-abc',
        reason: 'legacy module, migration scheduled',
        by: 'jdoe',
        expires: FUTURE,
      });

      const [stored] = readStore();
      expect(stored).toMatchObject({
        waiverRef: 'W-1',
        version: 1,
        fingerprint: 'fp-abc',
        status: 'requested',
        reason: 'legacy module, migration scheduled',
        requestedBy: 'jdoe',
        expiresAt: FUTURE,
      });
      // A freshly requested waiver must NOT carry an approver.
      expect(stored['approvedBy']).toBeUndefined();
    });

    it.each([
      ['--ref', { fingerprint: 'fp', reason: 'r', by: 'u', expires: FUTURE }],
      ['--fingerprint', { ref: 'W-1', reason: 'r', by: 'u', expires: FUTURE }],
      ['--reason', { ref: 'W-1', fingerprint: 'fp', by: 'u', expires: FUTURE }],
      ['--by', { ref: 'W-1', fingerprint: 'fp', reason: 'r', expires: FUTURE }],
      ['--expires', { ref: 'W-1', fingerprint: 'fp', reason: 'r', by: 'u' }],
    ])('refuses to record a waiver when the audit flag %s is missing', async (flag, options) => {
      // Each of these is part of the audit trail; a waiver missing one is not
      // auditable, so the command must fail rather than persist a partial record.
      await expect(command.executeCommand(['request'], options)).rejects.toThrow(
        `${flag} is required for this waiver action`,
      );
    });

    it('treats an empty-string flag as missing rather than as a valid empty audit value', async () => {
      await expect(
        command.executeCommand(['request'], {
          ref: 'W-1',
          fingerprint: 'fp',
          reason: '',
          by: 'u',
          expires: FUTURE,
        }),
      ).rejects.toThrow('--reason is required for this waiver action');
    });

    it('rejects an expiry that is not in the future, so a waiver cannot be born expired', async () => {
      await expect(
        command.executeCommand(['request'], {
          ref: 'W-1',
          fingerprint: 'fp',
          reason: 'r',
          by: 'u',
          expires: PAST,
        }),
      ).rejects.toThrow(/expiresAt must be after requestedAt/);
    });
  });

  describe('approve', () => {
    beforeEach(async () => {
      await command.executeCommand(['request'], {
        ref: 'W-1',
        fingerprint: 'fp-abc',
        reason: 'r',
        by: 'jdoe',
        expires: FUTURE,
      });
      logSpy.mockClear();
    });

    it('records the approver and flips the stored waiver to approved', async () => {
      await command.executeCommand(['approve'], { ref: 'W-1', by: 'lead' });

      const stored = readStore().find((w) => w['version'] === 1)!;
      expect(stored['status']).toBe('approved');
      expect(stored['approvedBy']).toBe('lead');
      expect(stored['approvedAt']).toEqual(expect.any(String));
    });

    it('refuses to approve a ref that was never requested, instead of inventing one', async () => {
      // Approving a non-existent ref must not create an approved waiver out of
      // thin air — that would suppress a finding nobody ever reviewed.
      await expect(command.executeCommand(['approve'], { ref: 'W-UNKNOWN', by: 'lead' })).rejects.toThrow(
        `No 'requested' waiver to approve for ref "W-UNKNOWN"`,
      );
      expect(readStore().some((w) => w['waiverRef'] === 'W-UNKNOWN')).toBe(false);
    });

    it('refuses a second approval, because an approved waiver is no longer in `requested`', async () => {
      await command.executeCommand(['approve'], { ref: 'W-1', by: 'lead' });

      await expect(command.executeCommand(['approve'], { ref: 'W-1', by: 'other' })).rejects.toThrow(
        `No 'requested' waiver to approve for ref "W-1"`,
      );
      // The original approver stands; a re-approval cannot rewrite the audit trail.
      expect(readStore().find((w) => w['version'] === 1)!['approvedBy']).toBe('lead');
    });

    it('approves the HIGHEST requested version when several are pending', async () => {
      // A revision leaves v1 approved and v2 requested; a second revision would
      // leave two requested versions. Approving the wrong one would leave the
      // newest, narrower terms unapproved while an older waiver keeps suppressing.
      await command.executeCommand(['approve'], { ref: 'W-1', by: 'lead' });
      await command.executeCommand(['revise'], { ref: 'W-1', by: 'jdoe', expires: FUTURE });
      await command.executeCommand(['revise'], { ref: 'W-1', by: 'jdoe', expires: FUTURE });

      await command.executeCommand(['approve'], { ref: 'W-1', by: 'lead2' });

      const approvedVersions = readStore()
        .filter((w) => w['status'] === 'approved')
        .map((w) => w['version']);
      expect(approvedVersions).toEqual(expect.arrayContaining([1, 3]));
      expect(readStore().find((w) => w['version'] === 3)!['approvedBy']).toBe('lead2');
    });

    it('requires --by so an approval is always attributable', async () => {
      await expect(command.executeCommand(['approve'], { ref: 'W-1' })).rejects.toThrow(
        '--by is required for this waiver action',
      );
    });
  });

  describe('revise', () => {
    beforeEach(async () => {
      await command.executeCommand(['request'], {
        ref: 'W-1',
        fingerprint: 'fp-abc',
        reason: 'original reason',
        by: 'jdoe',
        expires: FUTURE,
      });
      logSpy.mockClear();
    });

    it('adds a new requested version that supersedes the prior one and keeps history intact', async () => {
      await command.executeCommand(['revise'], { ref: 'W-1', by: 'jdoe', expires: FUTURE });

      const all = readStore();
      expect(all).toHaveLength(2); // nothing is mutated in place
      const v2 = all.find((w) => w['version'] === 2)!;
      expect(v2).toMatchObject({ status: 'requested', supersedes: 1, fingerprint: 'fp-abc' });
    });

    it('carries the prior reason forward when --reason is omitted', async () => {
      await command.executeCommand(['revise'], { ref: 'W-1', by: 'jdoe', expires: FUTURE });

      expect(readStore().find((w) => w['version'] === 2)!['reason']).toBe('original reason');
    });

    it('replaces the reason when one is supplied', async () => {
      await command.executeCommand(['revise'], {
        ref: 'W-1',
        by: 'jdoe',
        expires: FUTURE,
        reason: 'narrowed scope',
      });

      expect(readStore().find((w) => w['version'] === 2)!['reason']).toBe('narrowed scope');
    });

    it('refuses to revise a ref that does not exist', async () => {
      await expect(
        command.executeCommand(['revise'], { ref: 'W-NOPE', by: 'jdoe', expires: FUTURE }),
      ).rejects.toThrow('No waiver found for ref "W-NOPE"');
    });

    it('revises from the highest existing version, not the first one found', async () => {
      await command.executeCommand(['revise'], { ref: 'W-1', by: 'jdoe', expires: FUTURE });
      await command.executeCommand(['revise'], { ref: 'W-1', by: 'jdoe', expires: FUTURE });

      const v3 = readStore().find((w) => w['version'] === 3)!;
      expect(v3['supersedes']).toBe(2);
    });
  });

  describe('list', () => {
    it('is the default action when none is given', async () => {
      await command.executeCommand([], {});

      expect(stdout()).toContain('No waivers recorded.');
    });

    it('reports an empty store plainly instead of printing an empty table', async () => {
      await command.executeCommand(['list'], {});

      expect(stdout()).toContain('No waivers recorded.');
    });

    it('reports an approved but past-expiry waiver as expired, not as approved', async () => {
      // Expiry is time-derived, never a stored transition. If this branch
      // regresses, a lapsed waiver keeps suppressing its finding forever.
      seedStore(
        JSON.stringify([
          {
            waiverRef: 'W-OLD',
            version: 1,
            fingerprint: 'fp-old',
            status: 'approved',
            reason: 'r',
            requestedBy: 'jdoe',
            requestedAt: PAST,
            approvedBy: 'lead',
            approvedAt: PAST,
            expiresAt: PAST,
          },
        ]),
      );
      logSpy.mockClear();

      await command.executeCommand(['list'], { json: true });

      const listed = JSON.parse(stdout()).data.waivers;
      expect(listed[0].effectiveStatus).toBe('expired');
      // The STORED status is untouched — only the effective reading changes.
      expect(listed[0].status).toBe('approved');
    });

    it('filters by fingerprint so an unrelated waiver is not reported as covering a finding', async () => {
      await command.executeCommand(['request'], {
        ref: 'W-1', fingerprint: 'fp-abc', reason: 'r', by: 'u', expires: FUTURE,
      });
      await command.executeCommand(['request'], {
        ref: 'W-2', fingerprint: 'fp-xyz', reason: 'r', by: 'u', expires: FUTURE,
      });
      logSpy.mockClear();

      await command.executeCommand(['list'], { fingerprint: 'fp-abc', json: true });

      const listed = JSON.parse(stdout()).data.waivers;
      expect(listed.map((w: { waiverRef: string }) => w.waiverRef)).toEqual(['W-1']);
    });

    it('renders each stored waiver in human mode with its ref, version and effective status', async () => {
      await command.executeCommand(['request'], {
        ref: 'W-1', fingerprint: 'fp-abc', reason: 'r', by: 'u', expires: FUTURE,
      });
      logSpy.mockClear();

      await command.executeCommand(['list'], {});

      const out = stdout();
      expect(out).toContain('W-1@v1');
      expect(out).toContain('[requested]');
      expect(out).toContain('fp=fp-abc');
    });

    it('marks an approved, unexpired waiver distinctly from a rejected one', async () => {
      seedStore(
        JSON.stringify([
          { waiverRef: 'W-OK', version: 1, fingerprint: 'f1', status: 'approved', reason: 'r', requestedBy: 'u', requestedAt: PAST, expiresAt: FUTURE },
          { waiverRef: 'W-NO', version: 1, fingerprint: 'f2', status: 'rejected', reason: 'r', requestedBy: 'u', requestedAt: PAST, expiresAt: FUTURE },
        ]),
      );
      logSpy.mockClear();

      await command.executeCommand(['list'], {});

      const out = stdout();
      expect(out).toContain('W-OK@v1 [approved]');
      expect(out).toContain('W-NO@v1 [rejected]');
    });
  });

  describe('store selection', () => {
    it('honours --store so a caller can target a non-default waiver file', async () => {
      await command.executeCommand(['request'], {
        ref: 'W-1', fingerprint: 'fp', reason: 'r', by: 'u', expires: FUTURE,
        store: 'custom/waivers.json',
      });

      const custom = JSON.parse(readFileSync(join(workdir, 'custom', 'waivers.json'), 'utf8'));
      expect(custom[0].waiverRef).toBe('W-1');
    });

    /**
     * GT-677 · T6 — the anchor. The writer used to resolve `.evolith/waivers.json`
     * against `process.cwd()` while `evolith evaluate` read it from the workspace, so
     * a waiver approved from a CI step's working directory suppressed nothing.
     */
    it('T6 · resolves the store against the WORKSPACE, not the cwd', async () => {
      const elsewhere = mkdtempSync(join(tmpdir(), 'evolith-elsewhere-'));
      cwdSpy.mockReturnValue(elsewhere);
      try {
        await command.executeCommand(['request'], {
          ref: 'W-1', fingerprint: 'fp', reason: 'r', by: 'u', expires: FUTURE,
          workspace: workdir,
        });

        // Written under the WORKSPACE…
        expect(JSON.parse(readFileSync(storePath, 'utf8'))[0].waiverRef).toBe('W-1');
        // …and nothing under the cwd it happened to run from.
        expect(existsSync(join(elsewhere, '.evolith', 'waivers.json'))).toBe(false);
      } finally {
        cwdSpy.mockReturnValue(workdir);
        rmSync(elsewhere, { recursive: true, force: true });
      }
    });

    it('T6 · falls back to the profile satellite when no --workspace is given', async () => {
      const satellite = mkdtempSync(join(tmpdir(), 'evolith-satellite-'));
      const elsewhere = mkdtempSync(join(tmpdir(), 'evolith-elsewhere-'));
      cwdSpy.mockReturnValue(elsewhere);
      const scoped = new WaiverCommand(buildPromptService(), buildConfigService({ satellite }));
      try {
        await scoped.executeCommand(['request'], {
          ref: 'W-2', fingerprint: 'fp', reason: 'r', by: 'u', expires: FUTURE,
        });

        expect(JSON.parse(readFileSync(join(satellite, '.evolith', 'waivers.json'), 'utf8'))[0].waiverRef).toBe('W-2');
        expect(existsSync(join(elsewhere, '.evolith', 'waivers.json'))).toBe(false);
      } finally {
        cwdSpy.mockReturnValue(workdir);
        rmSync(satellite, { recursive: true, force: true });
        rmSync(elsewhere, { recursive: true, force: true });
      }
    });

    it('starts from an empty store when the waiver file is corrupt, so nothing is suppressed by accident', async () => {
      // Failing CLOSED matters: a lost waiver re-blocks its finding, which is
      // the safe direction. The opposite (crash, or a phantom suppression) is not.
      seedStore('{ not json', storePath.replace('waivers.json', 'corrupt.json'));
      logSpy.mockClear();

      await command.executeCommand(['list'], { store: '.evolith/corrupt.json' });

      expect(stdout()).toContain('No waivers recorded.');
    });
  });

  describe('unknown actions', () => {
    it('rejects an unrecognised action instead of silently falling through to list', async () => {
      // Silently listing on a typo'd `evolith waiver aprove` would report success
      // for an approval that never happened.
      await expect(command.executeCommand(['aprove'], { ref: 'W-1', by: 'lead' })).rejects.toThrow(
        'Unknown waiver action "aprove". Use request | approve | revise | list.',
      );
    });

    it('matches the action case-insensitively', async () => {
      await command.executeCommand(['LIST'], {});

      expect(stdout()).toContain('No waivers recorded.');
    });
  });

  describe('json output', () => {
    it('prints the persisted waiver as parseable JSON on request', async () => {
      await command.executeCommand(['request'], {
        ref: 'W-1', fingerprint: 'fp', reason: 'r', by: 'u', expires: FUTURE, json: true,
      });

      expect(JSON.parse(stdout())).toMatchObject({
        success: true,
        data: { waiverRef: 'W-1', version: 1, status: 'requested' },
      });
    });

    it('prints the approved waiver as parseable JSON on approve', async () => {
      await command.executeCommand(['request'], {
        ref: 'W-1', fingerprint: 'fp', reason: 'r', by: 'u', expires: FUTURE,
      });
      logSpy.mockClear();

      await command.executeCommand(['approve'], { ref: 'W-1', by: 'lead', json: true });

      expect(JSON.parse(stdout())).toMatchObject({
        success: true,
        data: { status: 'approved', approvedBy: 'lead' },
      });
    });
  });

  /**
   * GT-618 — a waiver is the highest-consequence action in the product: it
   * SUSPENDS a blocking rule. It was also the only command outside the ADR-0073
   * envelope — no `--format`, a raw array on stdout, no `success`, no `meta`,
   * no `correlationId` — so the one decision that cancels governance was the one
   * the Tracker could neither ingest nor correlate.
   */
  describe('GT-618 · ADR-0073 envelope', () => {
    const REQUEST = { ref: 'W-1', fingerprint: 'fp', reason: 'r', by: 'u', expires: FUTURE };

    it('accepts --format json, not only the legacy --json alias', async () => {
      await command.executeCommand(['request'], { ...REQUEST, format: 'json' });

      const envelope = JSON.parse(stdout());
      expect(envelope.success).toBe(true);
      expect(envelope.data.waiverRef).toBe('W-1');
    });

    it('carries success, meta and a correlationId on every action', async () => {
      for (const [action, options] of [
        ['request', REQUEST],
        ['approve', { ref: 'W-1', by: 'lead' }],
        ['list', {}],
      ] as const) {
        logSpy.mockClear();
        await command.executeCommand([action], { ...options, format: 'json' } as never);

        const envelope = JSON.parse(stdout());
        expect(envelope.success).toBe(true);
        expect(envelope.meta).toMatchObject({
          command: `evolith waiver ${action}`,
          schemaVersion: '1.0.0',
        });
        expect(typeof envelope.meta.correlationId).toBe('string');
        expect(envelope.meta.correlationId.length).toBeGreaterThan(0);
      }
    });

    it('carries the correlationId of the VERDICT being waived, not a fresh unrelated id', async () => {
      // Without this, a waiver cannot be joined to the decision it overrides —
      // which is the entire audit value of recording the waiver at all.
      const verdictId = '5f0c2f1e-0000-4000-8000-000000000abc';

      await command.executeCommand(['request'], { ...REQUEST, format: 'json', correlationId: verdictId });

      const envelope = JSON.parse(stdout());
      expect(envelope.meta.correlationId).toBe(verdictId);
      expect(envelope.data.verdictCorrelationId).toBe(verdictId);
    });

    it('reports a missing audit flag as an error envelope with exit 3, not an unhandled throw', async () => {
      await command.executeCommand(['request'], { fingerprint: 'fp', reason: 'r', by: 'u', expires: FUTURE, format: 'json' });

      const envelope = JSON.parse(stdout());
      expect(envelope).toMatchObject({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: '--ref is required for this waiver action' },
      });
      // GT-580: a malformed invocation is INVALID INPUT, distinguishable from a
      // store that could not be read (which stays 1).
      expect(process.exitCode).toBe(3);
    });

    it('reports an unknown action as invalid input rather than silently listing', async () => {
      await command.executeCommand(['aprove'], { ref: 'W-1', by: 'lead', format: 'json' });

      expect(JSON.parse(stdout())).toMatchObject({ success: false, error: { code: 'VALIDATION_FAILED' } });
      expect(process.exitCode).toBe(3);
    });

    it('emits ONLY the envelope on stdout, so `| jq` never sees decoration', async () => {
      await command.executeCommand(['list'], { format: 'json' });

      const printed = logSpy.mock.calls.map((c) => String(c[0]));
      expect(printed).toHaveLength(1);
      expect(() => JSON.parse(printed[0])).not.toThrow();
    });

    it('list returns a keyed collection, not a bare array', async () => {
      await command.executeCommand(['request'], REQUEST);
      logSpy.mockClear();

      await command.executeCommand(['list'], { format: 'json' });

      const envelope = JSON.parse(stdout());
      expect(Array.isArray(envelope)).toBe(false);
      expect(envelope.data.waivers).toHaveLength(1);
    });
  });

  describe('option parsers', () => {
    it.each([
      ['parseRef', 'W-1'],
      ['parseFingerprint', 'fp-abc'],
      ['parseReason', 'because'],
      ['parseBy', 'jdoe'],
      ['parseExpires', FUTURE],
      ['parseStore', 'custom.json'],
      ['parseWorkspace', '/tmp/ws'],
    ])('%s returns the value as-is', (method, value) => {
      expect((command as unknown as Record<string, (v: string) => string>)[method](value)).toBe(value);
    });

    it('parseJson always returns true', () => {
      expect(command['parseJson']()).toBe(true);
    });

    it.each([
      ['parseFormat', 'json'],
      ['parseCorrelationId', 'c-42'],
    ])('%s returns the value as-is', (method, value) => {
      expect((command as unknown as Record<string, (v: string) => string>)[method](value)).toBe(value);
    });
  });
});
