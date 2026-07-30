import * as path from 'path';
import { CliExitTaxonomyRuleHandler } from './cli-exit-taxonomy-rule.handler';
import { IFileSystem } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';

/**
 * GT-580 — the rule must be SEEN failing.
 *
 * Every scenario below plants a scratch CLI tree and asks the handler for a
 * verdict. The one that matters is `an out-of-taxonomy exit`: a command file
 * carrying `process.exit(7)` has to come back `failed`, because an assertion
 * that cannot fail is the defect this backlog is about.
 */

const CORE = '/core';
const CTX = { satellitePath: '/sat', corePath: CORE };
const CLI_SRC = path.join(CORE, 'src', 'sdk', 'cli', 'src');

/** The real `exit-codes.ts` shape, so CLI-EXIT-03 parses something authentic. */
const EXIT_CODES_TS = `
export const CLI_EXIT_CODES = {
  OK: 0,
  TOOL_FAILURE: 1,
  BLOCKED: 2,
  INVALID_INPUT: 3,
} as const;
`;

/**
 * An in-memory tree: `files` maps an absolute path to its contents, and every
 * directory on the way is derived rather than declared, so a scenario cannot
 * forget one and accidentally scan nothing.
 */
function treeFs(files: Record<string, string>): IFileSystem {
  const dirs = new Map<string, Set<string>>();
  for (const file of Object.keys(files)) {
    let current = file;
    for (;;) {
      const parent = path.dirname(current);
      if (parent === current) break;
      if (!dirs.has(parent)) dirs.set(parent, new Set());
      dirs.get(parent)!.add(path.basename(current));
      current = parent;
    }
  }

  return {
    exists: jest.fn(async (p: string) => p in files || dirs.has(p)),
    readFile: jest.fn(async (p: string) => files[p] ?? ''),
    readdirNames: jest.fn(async (p: string) => [...(dirs.get(p) ?? [])]),
    stat: jest.fn(async (p: string) => ({
      isDirectory: () => dirs.has(p) && !(p in files),
      isFile: () => p in files,
    })),
  } as unknown as IFileSystem;
}

function rule(id: string): NormalizedRule {
  return {
    id,
    severity: 'MUST',
    category: 'cli-exit-taxonomy',
    title: 't',
    description: 'd',
    blocking: true,
    sourceFile: 'cli/exit-code-taxonomy.rules.json',
  };
}

/** A CLI tree that obeys the taxonomy. */
function compliantTree(extra: Record<string, string> = {}): Record<string, string> {
  return {
    [path.join(CLI_SRC, 'infrastructure', 'cli', 'exit-codes.ts')]: EXIT_CODES_TS,
    [path.join(CLI_SRC, 'commands', 'gate', 'gate.command.ts')]:
      'if (blocked) process.exit(2);\nprocess.exitCode = 0;\n',
    [path.join(CLI_SRC, 'main.ts')]: 'process.exit(1);\n',
    ...extra,
  };
}

describe('GT-580 · CliExitTaxonomyRuleHandler', () => {
  it('claims the CLI-EXIT- family and nothing else', () => {
    const handler = new CliExitTaxonomyRuleHandler(treeFs(compliantTree()));
    expect(handler.canHandle(rule('CLI-EXIT-01'))).toBe(true);
    expect(handler.canHandle(rule('CLI-EXIT-03'))).toBe(true);
    expect(handler.canHandle(rule('CLI-RR-01'))).toBe(false);
    expect(handler.canHandle(rule('DEP-01'))).toBe(false);
  });

  it('passes all three rules on a CLI that obeys the taxonomy', async () => {
    const handler = new CliExitTaxonomyRuleHandler(treeFs(compliantTree()));
    for (const id of ['CLI-EXIT-01', 'CLI-EXIT-02', 'CLI-EXIT-03']) {
      const result = await handler.evaluate(rule(id), CTX);
      expect({ id, result: result.result }).toEqual({ id, result: 'passed' });
    }
  });

  // ---- the red -----------------------------------------------------------

  it('FAILS CLI-EXIT-01 on a command that exits outside the taxonomy', async () => {
    const rogue = path.join(CLI_SRC, 'commands', 'rogue', 'rogue.command.ts');
    const handler = new CliExitTaxonomyRuleHandler(
      treeFs(compliantTree({ [rogue]: 'export function boom(): void {\n  process.exit(7);\n}\n' })),
    );

    const result = await handler.evaluate(rule('CLI-EXIT-01'), CTX);

    expect(result.result).toBe('failed');
    // The finding must name the offender: "1 rule failed" sends nobody anywhere.
    expect(result.message).toContain('commands/rogue/rogue.command.ts');
    expect(result.message).toContain('process.exit(7)');
  });

  it('FAILS CLI-EXIT-01 on `process.exitCode = 64` too, not only on process.exit()', async () => {
    const rogue = path.join(CLI_SRC, 'commands', 'rogue', 'other.command.ts');
    const handler = new CliExitTaxonomyRuleHandler(
      treeFs(compliantTree({ [rogue]: 'process.exitCode = 64;\n' })),
    );

    const result = await handler.evaluate(rule('CLI-EXIT-01'), CTX);
    expect(result.result).toBe('failed');
    expect(result.message).toContain('process.exitCode = 64');
  });

  it('ignores test sources, which legitimately name codes outside the taxonomy', async () => {
    // Including the negative fixtures that prove this very rule can fail — if
    // they counted, the rule could never be green anywhere.
    const handler = new CliExitTaxonomyRuleHandler(
      treeFs(
        compliantTree({
          [path.join(CLI_SRC, 'commands', 'rogue', 'rogue.spec.ts')]: 'process.exit(9);\n',
          [path.join(CLI_SRC, 'commands', 'rogue', 'rogue.test.ts')]: 'process.exit(77);\n',
        }),
      ),
    );

    expect((await handler.evaluate(rule('CLI-EXIT-01'), CTX)).result).toBe('passed');
  });

  it('FAILS CLI-EXIT-02 when the scan reads nothing', async () => {
    // The source root exists but holds no `.ts` — the shape a moved directory
    // produces, and the one that would otherwise report perfect compliance.
    const handler = new CliExitTaxonomyRuleHandler(
      treeFs({ [path.join(CLI_SRC, 'README.md')]: '# not a source' }),
    );

    const result = await handler.evaluate(rule('CLI-EXIT-02'), CTX);
    expect(result.result).toBe('failed');
    expect(result.message).toContain('0 sources');
  });

  it('FAILS rather than skips when the CLI source root is absent', async () => {
    // `skipped` on a blocking rule is the silent pass this rule exists against.
    const handler = new CliExitTaxonomyRuleHandler(treeFs({ '/elsewhere/file.ts': '' }));
    for (const id of ['CLI-EXIT-01', 'CLI-EXIT-02', 'CLI-EXIT-03']) {
      const result = await handler.evaluate(rule(id), CTX);
      expect({ id, result: result.result }).toEqual({ id, result: 'failed' });
    }
  });

  it('FAILS CLI-EXIT-03 when the taxonomy is widened to absorb the offender', async () => {
    // The escape hatch: declare 7 legal and CLI-EXIT-01 goes quiet. This is the
    // rule that stops that from being a fix.
    const widened = EXIT_CODES_TS.replace('} as const;', '  ROGUE: 7,\n} as const;');
    const handler = new CliExitTaxonomyRuleHandler(
      treeFs(compliantTree({ [path.join(CLI_SRC, 'infrastructure', 'cli', 'exit-codes.ts')]: widened })),
    );

    const result = await handler.evaluate(rule('CLI-EXIT-03'), CTX);
    expect(result.result).toBe('failed');
    expect(result.message).toContain('[0, 1, 2, 3, 7]');
  });
});
