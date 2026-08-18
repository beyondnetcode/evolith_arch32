/**
 * GT-588 · criterion 2 + 3 — `evolith audit verify` against a real ledger file.
 *
 * The exit code is the assertion that matters: a tampered ledger must exit `2`
 * (BLOCKED) so a CI step blocks on it without parsing output. The tests write an
 * actual JSONL file to a temp directory and read it back through the command, so the
 * file-reading path is exercised rather than mocked away.
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { TransparencyRecorderService } from '@beyondnet/evolith-core-domain/application/services/transparency-recorder.service';
import type { ITransparencyLedger } from '@beyondnet/evolith-core-domain/domain/transparency';
import type { TransparencyLedgerEntry } from '@beyondnet/evolith-core-domain/domain/transparency';
import {
  Ed25519StatementSigner,
  MerkleTransparencyService,
  NodeSha256Hasher,
  createDevelopmentSigningKey,
} from '@beyondnet/evolith-core-domain/infrastructure/transparency';

import { AuditCommand } from './audit.command';
import type { PromptService } from '../../infrastructure/prompts/prompt.service';
import { CLI_EXIT_CODES, CliUsageError } from '../../infrastructure/cli/exit-codes';

jest.mock('chalk', () => {
  const id = (s: string) => s;
  const proxy: any = new Proxy(id, { get: () => id });
  return {
    __esModule: true, default: proxy,
    green: id, red: id, yellow: id, blue: id, bold: id, cyan: id, gray: id,
    magenta: id, white: id, blueBright: id, redBright: id, dim: id,
  };
});

class ArrayLedger implements ITransparencyLedger {
  readonly entries: TransparencyLedgerEntry[] = [];
  async append(e: TransparencyLedgerEntry): Promise<void> { this.entries.push(e); }
  async readAll(): Promise<readonly TransparencyLedgerEntry[]> { return this.entries; }
}

const hasher = new NodeSha256Hasher();
let tmpDir: string;

async function writeLedger(name: string, mutate?: (entries: TransparencyLedgerEntry[]) => void) {
  const issuerKey = createDevelopmentSigningKey({ role: 'issuer' });
  const serviceKey = createDevelopmentSigningKey({ role: 'ts' });
  const ledger = new ArrayLedger();
  const recorder = new TransparencyRecorderService(
    new Ed25519StatementSigner(issuerKey, hasher),
    new MerkleTransparencyService(serviceKey, hasher),
    ledger,
  );
  for (let i = 0; i < 3; i++) {
    await recorder.record({
      statementId: `decision-${i}`,
      subject: `gate/quality-${i}`,
      eventType: 'gate.evaluated',
      verdict: i === 1 ? 'FAIL' : 'PASS',
      occurredAt: `2026-07-2${i}T09:00:00.000Z`,
      payload: { score: 70 + i },
    });
  }

  const entries = JSON.parse(JSON.stringify(ledger.entries)) as TransparencyLedgerEntry[];
  mutate?.(entries);

  const file = path.join(tmpDir, name);
  await fs.writeFile(file, entries.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf-8');

  const anchorsFile = path.join(tmpDir, `${name}.anchors.json`);
  await fs.writeFile(anchorsFile, JSON.stringify([
    { keyId: issuerKey.identity.keyId, publicKeySpki: issuerKey.identity.publicKeySpki },
    { keyId: serviceKey.identity.keyId, publicKeySpki: serviceKey.identity.publicKeySpki },
  ]), 'utf-8');

  return { file, anchorsFile };
}

function setup() {
  const command = new AuditCommand();
  (command as unknown as { promptService: PromptService }).promptService = {
    showIntro: jest.fn(), showInfo: jest.fn(), showWarning: jest.fn(),
    showSuccess: jest.fn(), showError: jest.fn(), showOutro: jest.fn(), stopSpinner: jest.fn(),
  } as unknown as PromptService;
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  return { command, log };
}

/** Read the JSON envelope the command printed in `--format json` mode. */
function envelope(log: jest.SpyInstance): any {
  const calls = log.mock.calls;
  return JSON.parse(String(calls[calls.length - 1]?.[0]));
}

describe('evolith audit verify (GT-588)', () => {
  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gt588-cli-'));
  });
  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
  beforeEach(() => {
    process.exitCode = undefined;
    jest.restoreAllMocks();
  });

  it('rejects an unknown action with INVALID_INPUT', async () => {
    const { command } = setup();
    await expect(command.executeCommand(['export'], {})).rejects.toBeInstanceOf(CliUsageError);
  });

  it('BLOCKS (exit 2) on a ledger signed by the development identity, even though it verifies', async () => {
    // The shipped state: cryptography fine, custody absent, AUD-TRANSP-04 red.
    const { file, anchorsFile } = await writeLedger('clean.jsonl');
    const { command, log } = setup();

    await command.executeCommand(['verify'], { ledger: file, trustAnchors: anchorsFile, format: 'json' });

    expect(process.exitCode).toBe(CLI_EXIT_CODES.BLOCKED);
    const env = envelope(log);
    expect(env.success).toBe(false);
  });

  it('carries the findings in the JSON envelope on the FAILING branch — the branch that has findings', async () => {
    // Written against the unfixed command, where it failed: `--format json` emitted
    // `{code: GATE_BLOCKED, message}` and discarded the payload, so a machine consumer
    // learned that something was wrong and nothing about what. Every case in this file
    // asserted `success === false` and none looked inside, which is how it survived.
    const { file, anchorsFile } = await writeLedger('details.jsonl');
    const { command, log } = setup();

    await command.executeCommand(['verify'], { ledger: file, trustAnchors: anchorsFile, format: 'json' });

    const details = envelope(log).error?.details;
    expect(details).toBeDefined();
    expect(details.entryCount).toBeGreaterThan(0);
    expect(details.cryptographicallyIntact).toBe(true);
    expect(details.trustAnchors).toBe('anchored');
    expect(details.recomputedRoot).toMatch(/^[0-9a-f]{64}$/);
    expect(details.violations.map((v: { ruleId: string }) => v.ruleId)).toContain('AUD-TRANSP-04');
  });

  it('BLOCKS (exit 2) when a decision was edited after signing', async () => {
    const { file, anchorsFile } = await writeLedger('tampered.jsonl', (entries) => {
      (entries[1].decision as { verdict?: string }).verdict = 'PASS';
    });
    const { command, log } = setup();

    await command.executeCommand(['verify'], { ledger: file, trustAnchors: anchorsFile, format: 'json' });

    expect(process.exitCode).toBe(CLI_EXIT_CODES.BLOCKED);
    expect(envelope(log).error.message).toMatch(/does not verify/);
  });

  it('BLOCKS (exit 2) when the ledger file does not exist at all', async () => {
    const { command } = setup();
    await command.executeCommand(['verify'], { ledger: path.join(tmpDir, 'absent.jsonl') });
    expect(process.exitCode).toBe(CLI_EXIT_CODES.BLOCKED);
  });

  it('reports self-asserted anchors when none are supplied out of band', async () => {
    const { file } = await writeLedger('anchorless.jsonl');
    const { command, log } = setup();

    await command.executeCommand(['verify'], { ledger: file });

    const printed = log.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toMatch(/self-asserted/);
    expect(printed).toMatch(/AUD-TRANSP-04/);
    expect(process.exitCode).toBe(CLI_EXIT_CODES.BLOCKED);
  });

  it('still verifies the receipts cryptographically and prints the recomputed tree head', async () => {
    const { file, anchorsFile } = await writeLedger('root.jsonl');
    const { command, log } = setup();

    await command.executeCommand(['verify'], { ledger: file, trustAnchors: anchorsFile });

    const printed = log.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toMatch(/Tree head\s+[0-9a-f]{64}/);
    expect(printed).toMatch(/verify/);
  });

  it('distinguishes a tampered ledger from a merely unsigned one in its violations', async () => {
    const { file, anchorsFile } = await writeLedger('deleted.jsonl', (entries) => { entries.splice(1, 1); });
    const { command, log } = setup();

    await command.executeCommand(['verify'], { ledger: file, trustAnchors: anchorsFile });

    const printed = log.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toMatch(/AUD-TRANSP-03/);
    expect(printed).toMatch(/DO NOT VERIFY/);
  });

  it('rejects an unreadable trust-anchor file as INVALID_INPUT', async () => {
    const { file } = await writeLedger('anchors-bad.jsonl');
    const { command } = setup();
    await expect(
      command.executeCommand(['verify'], { ledger: file, trustAnchors: path.join(tmpDir, 'nope.json') }),
    ).rejects.toBeInstanceOf(CliUsageError);
  });
});
