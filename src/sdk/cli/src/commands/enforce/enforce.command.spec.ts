import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { EnforceCommand } from './enforce.command';

/** A ruleset mixing a compilable enforcer rule, a skip-fallback rule, and a native rule. */
const RULESET = {
  title: 'test',
  rules: [
    {
      id: 'HXA-04',
      category: 'dependency-direction',
      title: 'Dependency direction',
      blocking: true,
      enforce: {
        engine: 'enforcer',
        tool: 'dependency-cruiser',
        toolRuleId: 'no-backward',
        runtime: 'node',
        mode: 'block',
        config: { from: { path: '^src/domain/' }, to: { path: '^src/application/' } },
      },
    },
    {
      id: 'DEP-1',
      category: 'layer-structure',
      enforce: { engine: 'enforcer', tool: 'Deptrac', runtime: 'node' },
    },
    { id: 'GOV-1', category: 'governance', title: 'native rule', blocking: false },
  ],
};

describe('EnforceCommand — enforce compile (GT-516 · EAG-10)', () => {
  let dir: string;
  let rulesetPath: string;
  let command: EnforceCommand;
  let mockPrompt: Record<string, jest.Mock>;
  let logSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'enforce-spec-'));
    rulesetPath = join(dir, 'ruleset.json');
    writeFileSync(rulesetPath, JSON.stringify(RULESET), 'utf-8');

    mockPrompt = {
      showIntro: jest.fn(),
      showInfo: jest.fn(),
      showWarning: jest.fn(),
      showError: jest.fn(),
      showSuccess: jest.fn(),
      showOutro: jest.fn(),
    };
    command = new EnforceCommand(mockPrompt as any);

    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(((): never => {
      throw new Error('process.exit');
    }) as never);
  });

  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
    rmSync(dir, { recursive: true, force: true });
  });

  function lastEnvelope(): any {
    const out = logSpy.mock.calls.map((c) => c[0]).join('\n');
    return JSON.parse(out);
  }

  it('emits a valid ADR-0073 success envelope with compiled + fallback report', async () => {
    await command.executeCommand(['compile'], { file: rulesetPath, format: 'json' });

    const env = lastEnvelope();
    expect(env.success).toBe(true);
    expect(env.meta).toMatchObject({ command: 'evolith enforce compile', schemaVersion: '1.0.0' });
    expect(typeof env.meta.correlationId).toBe('string');
    expect(typeof env.meta.executedAt).toBe('string');

    const data = env.data;
    expect(data.action).toBe('compile');
    expect(data.summary).toMatchObject({
      totalRules: 3,
      enforcerRules: 2,
      compiled: 1,
      fallbacks: 1,
    });
    // native GOV-1 is neither compiled nor a fallback
    expect(data.compiled.map((c: any) => c.ruleId)).toEqual(['HXA-04']);
    expect(data.fallbacks.map((f: any) => f.ruleId)).toEqual(['DEP-1']);
    expect(data.fallbacks[0]).toMatchObject({ fallback: 'skip', tool: 'Deptrac' });
    expect(data.summary.byTool).toEqual({ 'dependency-cruiser': 1 });
  });

  it('lowers the enforce block into a dependency-cruiser forbidden config fragment', async () => {
    await command.executeCommand(['compile'], { file: rulesetPath, format: 'json' });

    const { data } = lastEnvelope();
    expect(data.dependencyCruiserConfig.forbidden).toHaveLength(1);
    expect(data.dependencyCruiserConfig.forbidden[0]).toMatchObject({
      name: 'no-backward',
      severity: 'error',
      from: { path: '^src/domain/' },
      to: { path: '^src/application/' },
    });
    expect(data.compiled[0]).toMatchObject({ tool: 'dependency-cruiser', runtime: 'node', mode: 'block' });
  });

  it('writes the envelope to --output when provided', async () => {
    const outPath = join(dir, 'compiled.json');
    await command.executeCommand(['compile'], { file: rulesetPath, format: 'json', output: outPath });

    const fs = await import('fs-extra');
    const written = JSON.parse(await fs.readFile(outPath, 'utf-8'));
    expect(written.success).toBe(true);
    expect(written.data.action).toBe('compile');
    // nothing printed to stdout when routed to a file
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('rejects an unknown action with an error envelope and non-zero exit', async () => {
    await expect(command.executeCommand(['bogus'], { format: 'json' })).rejects.toThrow('process.exit');
    const env = lastEnvelope();
    expect(env.success).toBe(false);
    expect(env.error.code).toBe('VALIDATION_FAILED');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('requires a ruleset input (--file or --ruleset)', async () => {
    await expect(command.executeCommand(['compile'], { format: 'json' })).rejects.toThrow('process.exit');
    const env = lastEnvelope();
    expect(env.success).toBe(false);
    expect(env.error.code).toBe('VALIDATION_FAILED');
    expect(env.error.message).toMatch(/--file|--ruleset/);
  });

  it('emits an IO_ERROR envelope for a missing ruleset file', async () => {
    await expect(
      command.executeCommand(['compile'], { file: join(dir, 'nope.json'), format: 'json' }),
    ).rejects.toThrow('process.exit');
    const env = lastEnvelope();
    expect(env.success).toBe(false);
    expect(env.error.code).toBe('IO_ERROR');
  });

  it('renders a human summary when format is not json', async () => {
    await command.executeCommand(['compile'], { file: rulesetPath });
    const info = mockPrompt.showInfo.mock.calls.map((c) => c[0]).join('\n');
    expect(info).toContain('1 compiled');
    expect(mockPrompt.showOutro).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  describe('option parsers return their input verbatim', () => {
    it.each([
      ['parseFormat', 'json'],
      ['parseFile', '/x.json'],
      ['parseRuleset', 'adr-0002'],
      ['parseCore', '/core'],
      ['parseOutput', '/out.json'],
    ])('%s', (method, value) => {
      expect((command as any)[method](value)).toBe(value);
    });
  });
});
