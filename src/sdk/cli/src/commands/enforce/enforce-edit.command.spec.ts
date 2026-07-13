import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { EnforceCommand } from './enforce.command';

/** The compiled boundary contract fed to the edit gate (GT-526). */
const BOUNDARY_RULES = [
  {
    ruleId: 'HXA-01',
    adrRef: 'ADR-0002',
    appliesTo: 'src/domain/',
    forbiddenImports: ['../infrastructure', 'src/infrastructure'],
    severity: 'error',
    message: 'Domain must not depend on Infrastructure (ADR-0002).',
  },
];

function claudeWrite(filePath: string, content: string): string {
  return JSON.stringify({
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: { file_path: filePath, content },
  });
}

describe('EnforceCommand — enforce edit (GT-526 · cross-agent edit-time gate)', () => {
  let dir: string;
  let rulesPath: string;
  let command: EnforceCommand;
  let mockPrompt: Record<string, jest.Mock>;
  let logSpy: jest.SpyInstance;
  let errSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'enforce-edit-'));
    rulesPath = join(dir, 'boundary-rules.json');
    writeFileSync(rulesPath, JSON.stringify(BOUNDARY_RULES), 'utf-8');

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
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(((): never => {
      throw new Error('process.exit');
    }) as never);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    exitSpy.mockRestore();
    rmSync(dir, { recursive: true, force: true });
  });

  function lastEnvelope(): any {
    const out = logSpy.mock.calls.map((c) => c[0]).join('\n');
    return JSON.parse(out);
  }

  it('ALLOWS a conforming edit — exit 0, no process.exit, success envelope allow=true', async () => {
    await command.executeCommand(['edit'], {
      rules: rulesPath,
      format: 'json',
      payload: claudeWrite('src/domain/order.ts', "import { Money } from './money';"),
    });
    expect(exitSpy).not.toHaveBeenCalled();
    const env = lastEnvelope();
    expect(env.success).toBe(true);
    expect(env.meta).toMatchObject({ command: 'evolith enforce edit' });
    expect(env.data).toMatchObject({ action: 'edit', vendor: 'claude-code', allow: true, blocked: false });
    expect(env.data.violations).toHaveLength(0);
  });

  it('BLOCKS a domain→infrastructure edit — exit 2 with a canonical violation', async () => {
    await expect(
      command.executeCommand(['edit'], {
        rules: rulesPath,
        format: 'json',
        payload: claudeWrite('src/domain/order.ts', "import { Db } from '../infrastructure/db';"),
      }),
    ).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(2);
    const env = lastEnvelope();
    expect(env.data).toMatchObject({ action: 'edit', allow: false, blocked: true });
    expect(env.data.violations[0]).toMatchObject({ ruleId: 'HXA-01', tool: 'edit-gate', file: 'src/domain/order.ts', line: 1 });
  });

  it('prints the human BLOCK verdict to stderr and exits 2 (default format)', async () => {
    await expect(
      command.executeCommand(['edit'], {
        rules: rulesPath,
        payload: claudeWrite('src/domain/order.ts', "import { Db } from '../infrastructure/db';"),
      }),
    ).rejects.toThrow('process.exit');
    const stderr = errSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(stderr).toContain('BLOCK');
    expect(stderr).toContain('HXA-01');
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('ALLOWS (does not block) an unrelated tool call like Bash', async () => {
    await command.executeCommand(['edit'], {
      rules: rulesPath,
      format: 'json',
      payload: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'ls' } }),
    });
    expect(exitSpy).not.toHaveBeenCalled();
    expect(lastEnvelope().data).toMatchObject({ vendor: null, blocked: false });
  });

  it('requires --rules (VALIDATION_FAILED, exit 1)', async () => {
    await expect(
      command.executeCommand(['edit'], { format: 'json', payload: claudeWrite('src/domain/x.ts', 'x') }),
    ).rejects.toThrow('process.exit');
    const env = lastEnvelope();
    expect(env.success).toBe(false);
    expect(env.error.code).toBe('VALIDATION_FAILED');
    expect(env.error.message).toMatch(/--rules/);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('rejects an invalid JSON payload (VALIDATION_FAILED, exit 1)', async () => {
    await expect(
      command.executeCommand(['edit'], { rules: rulesPath, format: 'json', payload: '{not json' }),
    ).rejects.toThrow('process.exit');
    expect(lastEnvelope().error.code).toBe('VALIDATION_FAILED');
  });

  it('emits an error envelope for a missing rules file', async () => {
    await expect(
      command.executeCommand(['edit'], {
        rules: join(dir, 'nope.json'),
        format: 'json',
        payload: claudeWrite('src/domain/x.ts', 'x'),
      }),
    ).rejects.toThrow('process.exit');
    expect(lastEnvelope().success).toBe(false);
  });

  it('new edit option parsers return their input verbatim', () => {
    expect((command as any).parseRules('/r.json')).toBe('/r.json');
    expect((command as any).parsePayload('{}')).toBe('{}');
    expect((command as any).parseVendor('claude-code')).toBe('claude-code');
  });
});
