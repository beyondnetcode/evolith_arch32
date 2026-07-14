import { parseImportLinterReport, isImportLinterFailure, buildImportLinterSpec, IMPORT_LINTER_TOOL } from './import-linter-adapter';

// A real `lint-imports` broken-contract report (colour stripped).
const BROKEN = `=============
Import Linter
=============

Analyzed 4 files, 1 dependencies.
---------------------------------

HXA-layers BROKEN

Contracts: 0 kept, 1 broken.


----------------
Broken contracts
----------------

HXA-layers
----------

myapp.domain is not allowed to import myapp.infrastructure:

- myapp.domain -> myapp.infrastructure (l.1)
`;
const KEPT = `Analyzed 4 files, 1 dependencies.
---------------------------------

HXA-layers KEPT

Contracts: 1 kept, 0 broken.
`;

describe('ImportLinterAdapter (GT-521 — Python)', () => {
  it('maps a broken contract into a canonical Violation', () => {
    const v = parseImportLinterReport(BROKEN);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ ruleId: 'HXA-layers', tool: IMPORT_LINTER_TOOL, severity: 'error', file: '' });
    expect(v[0].message).toContain('not allowed to import');
    expect(v[0].message).toContain('myapp.domain -> myapp.infrastructure');
    expect(v[0].fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });

  it('yields [] for an all-kept report and for malformed input (0 false positives)', () => {
    expect(parseImportLinterReport(KEPT)).toEqual([]);
    expect(parseImportLinterReport('garbage')).toEqual([]);
    expect(parseImportLinterReport('')).toEqual([]);
  });

  it('treats "no summary + non-zero exit" as a tool failure (skip, not false-pass)', () => {
    expect(isImportLinterFailure({ stdout: 'ModuleNotFoundError', stderr: '', exitCode: 1 })).toBe(true);
    expect(isImportLinterFailure({ stdout: KEPT, stderr: '', exitCode: 0 })).toBe(false);
    expect(isImportLinterFailure({ stdout: BROKEN, stderr: '', exitCode: 1 })).toBe(false); // broken != tool failure
  });

  it('builds a lint-imports invocation scoped to the workspace', () => {
    const spec = buildImportLinterSpec({ satellitePath: '/w', corePath: '/c', rules: [] }, { configPath: '.importlinter' });
    expect(spec).toMatchObject({ command: 'lint-imports', cwd: '/w' });
    expect(spec.args).toEqual(['--config', '.importlinter']);
  });
});
