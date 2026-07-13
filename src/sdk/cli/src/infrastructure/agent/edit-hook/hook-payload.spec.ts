import {
  normalizeEditIntent,
  relativizePath,
  claudeCodeAdapter,
  genericAdapter,
  EDIT_HOOK_ADAPTERS,
} from './hook-payload';

describe('relativizePath (GT-526 — author-friendly boundary matching)', () => {
  it('strips the cwd prefix from an absolute path', () => {
    expect(relativizePath('/repo/src/domain/order.ts', '/repo')).toBe('src/domain/order.ts');
  });
  it('tolerates a trailing slash on cwd', () => {
    expect(relativizePath('/repo/src/domain/order.ts', '/repo/')).toBe('src/domain/order.ts');
  });
  it('leaves a path outside cwd untouched', () => {
    expect(relativizePath('/other/x.ts', '/repo')).toBe('/other/x.ts');
  });
  it('normalizes a leading ./ when no cwd is given', () => {
    expect(relativizePath('./src/domain/order.ts')).toBe('src/domain/order.ts');
  });
});

describe('claudeCodeAdapter — PreToolUse shapes', () => {
  it('extracts a Write intent (full content) and relativizes the path', () => {
    const intent = normalizeEditIntent({
      hook_event_name: 'PreToolUse',
      cwd: '/repo',
      tool_name: 'Write',
      tool_input: { file_path: '/repo/src/domain/order.ts', content: "import x from './y';" },
    });
    expect(intent).toEqual({
      vendor: 'claude-code',
      edit: { filePath: 'src/domain/order.ts', content: "import x from './y';" },
    });
  });

  it('extracts an Edit intent from new_string (the text about to be introduced)', () => {
    const intent = normalizeEditIntent({
      tool_name: 'Edit',
      tool_input: {
        file_path: 'src/domain/order.ts',
        old_string: 'const a = 1;',
        new_string: "import { Db } from '../infrastructure/db';",
      },
    });
    expect(intent?.edit.content).toBe("import { Db } from '../infrastructure/db';");
    expect(intent?.edit.filePath).toBe('src/domain/order.ts');
  });

  it('concatenates every new_string of a MultiEdit', () => {
    const intent = normalizeEditIntent({
      tool_name: 'MultiEdit',
      tool_input: {
        file_path: 'src/domain/order.ts',
        edits: [
          { old_string: 'a', new_string: "import './a';" },
          { old_string: 'b', new_string: "import '../infrastructure/db';" },
        ],
      },
    });
    expect(intent?.edit.content).toContain('../infrastructure/db');
  });

  it('returns null for a non-writing tool (Read/Bash) — nothing to gate', () => {
    expect(normalizeEditIntent({ tool_name: 'Read', tool_input: { file_path: 'x.ts' } })).toBeNull();
    expect(normalizeEditIntent({ tool_name: 'Bash', tool_input: { command: 'ls' } })).toBeNull();
  });

  it('returns null when a Write has no content', () => {
    expect(normalizeEditIntent({ tool_name: 'Write', tool_input: { file_path: 'x.ts' } })).toBeNull();
  });
});

describe('genericAdapter — cross-agent plug-in shape (Cursor/Copilot/custom)', () => {
  it('accepts the canonical { filePath, content } shape', () => {
    const intent = normalizeEditIntent({ filePath: 'src/domain/order.ts', content: "import '../infrastructure/x';" });
    expect(intent).toEqual({
      vendor: 'generic',
      edit: { filePath: 'src/domain/order.ts', content: "import '../infrastructure/x';" },
    });
  });

  it('accepts file_path/text aliases', () => {
    const intent = normalizeEditIntent({ file_path: 'src/domain/order.ts', text: 'const x = 1;' });
    expect(intent?.vendor).toBe('generic');
    expect(intent?.edit.content).toBe('const x = 1;');
  });
});

describe('vendorHint + registry ordering', () => {
  it('honors an explicit vendor hint (skips auto-detection)', () => {
    const raw = { filePath: 'src/domain/order.ts', content: 'x' };
    expect(normalizeEditIntent(raw, 'claude-code')).toBeNull(); // claude-code adapter does not match this shape
    expect(normalizeEditIntent(raw, 'generic')?.vendor).toBe('generic');
  });

  it('registers claude-code before generic', () => {
    expect(EDIT_HOOK_ADAPTERS[0]).toBe(claudeCodeAdapter);
    expect(EDIT_HOOK_ADAPTERS[1]).toBe(genericAdapter);
  });
});
