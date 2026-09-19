import * as fs from 'fs';
import * as path from 'path';
import type { IFileSystem } from '../../domain/interfaces';
import { RuleOverridesInvalidError, RuleOverridesLoader, readRuleOverridesRef } from './rule-overrides.loader';

/**
 * GT-678 — the document is read and schema-checked BEFORE anything runs, and a
 * document that is named and cannot be honoured is a named error, never a
 * silently unchanged run.
 *
 * The schema and the shipped example are the REAL files: a synthetic schema
 * could not catch the example drifting from the contract it demonstrates.
 */

const REPO_RULESETS = path.resolve(__dirname, '..', '..', '..', '..', '..', 'rulesets');
const REAL_SCHEMA = fs.readFileSync(path.join(REPO_RULESETS, 'schema', 'rule-overrides.schema.json'), 'utf-8');
const REAL_EXAMPLE = fs.readFileSync(path.join(REPO_RULESETS, 'tenants', 'example', 'rule-overrides.json'), 'utf-8');

function fakeFs(files: Record<string, string>, dirs: string[] = []): IFileSystem {
  const dirSet = new Set(dirs);
  return {
    exists: async (p: string) => p in files || dirSet.has(p),
    readFile: async (p: string) => {
      if (!(p in files)) throw new Error(`ENOENT: ${p}`);
      return files[p];
    },
    readdirNames: async (p: string) => {
      const prefix = `${p}/`;
      return [...new Set([...Object.keys(files), ...dirSet].filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length).split('/')[0]))];
    },
  } as unknown as IFileSystem;
}

/** A corpus root that `probeRulesetsLocation` recognises, carrying only the override schema. */
const CORE = '/core';
const CORPUS_FILES = {
  '/core/src/rulesets/schema/rule-overrides.schema.json': REAL_SCHEMA,
  '/core/src/rulesets/acl/anti-corruption-layer.rules.json': '{"rules":[]}',
};
const CORPUS_DIRS = ['/core/src/rulesets', '/core/src/rulesets/schema', '/core/src/rulesets/acl'];

describe('readRuleOverridesRef · GT-678', () => {
  it('reads the canonical `spec.rulesets.overrides` and the legacy top-level `rulesets.overrides`', () => {
    expect(readRuleOverridesRef({ spec: { rulesets: { overrides: 'governance/rule-overrides.json' } } })).toBe(
      'governance/rule-overrides.json',
    );
    expect(readRuleOverridesRef({ rulesets: { overrides: ' ./overrides.json ' } })).toBe('./overrides.json');
    expect(readRuleOverridesRef({ coreRef: { version: '1.0.0' } })).toBeUndefined();
    expect(readRuleOverridesRef({ spec: { rulesets: { overrides: '' } } })).toBeUndefined();
    expect(readRuleOverridesRef(null)).toBeUndefined();
  });
});

describe('RuleOverridesLoader · GT-678', () => {
  it('loads the shipped example against the shipped schema', async () => {
    const loader = new RuleOverridesLoader(
      fakeFs({ ...CORPUS_FILES, '/sat/governance/rule-overrides.json': REAL_EXAMPLE }, CORPUS_DIRS),
    );
    const input = await loader.load('/sat', 'governance/rule-overrides.json', CORE);
    expect(input.source).toBe('governance/rule-overrides.json');
    expect(input.document.tenantId).toBe('example-corp');
    expect(Object.keys(input.document.rules)).toEqual(['ACL-02', 'ACL-04', 'TAX-04', 'SSDF-PS.3.2']);
    // The example demonstrates a waiver: approver AND expiry on the blocking rule.
    expect(input.document.rules['ACL-02']).toMatchObject({ blocking: false, approvedBy: 'cto@example.com', expiresOn: '2026-12-31' });
  });

  it('a named document that is MISSING is a named error, not a skipped one', async () => {
    const loader = new RuleOverridesLoader(fakeFs(CORPUS_FILES, CORPUS_DIRS));
    await expect(loader.load('/sat', 'governance/rule-overrides.json', CORE)).rejects.toThrow(RuleOverridesInvalidError);
    await expect(loader.load('/sat', 'governance/rule-overrides.json', CORE)).rejects.toThrow(/no file exists at \/sat\/governance\/rule-overrides\.json/);
  });

  it('a document outside the satellite is refused', async () => {
    const loader = new RuleOverridesLoader(
      fakeFs({ ...CORPUS_FILES, '/elsewhere/rule-overrides.json': REAL_EXAMPLE }, CORPUS_DIRS),
    );
    await expect(loader.load('/sat', '../elsewhere/rule-overrides.json', CORE)).rejects.toThrow(/resolves outside the satellite/);
    await expect(loader.load('/sat', '/elsewhere/rule-overrides.json', CORE)).rejects.toThrow(/resolves outside the satellite/);
  });

  it('malformed JSON is a named error', async () => {
    const loader = new RuleOverridesLoader(
      fakeFs({ ...CORPUS_FILES, '/sat/o.json': '{ "tenantId": ' }, CORPUS_DIRS),
    );
    await expect(loader.load('/sat', 'o.json', CORE)).rejects.toThrow(/o\.json is not valid JSON/);
  });

  it('a schema violation is a named error that names the offending key', async () => {
    const bad = JSON.stringify({
      tenantId: 'acme',
      version: '1.0.0',
      effectiveDate: '2026-09-01',
      approvedBy: 'x',
      rules: { 'ACL-02': { enabeld: false, rationale: 'typo' } },
    });
    const loader = new RuleOverridesLoader(fakeFs({ ...CORPUS_FILES, '/sat/o.json': bad }, CORPUS_DIRS));
    const failure = loader.load('/sat', 'o.json', CORE);
    await expect(failure).rejects.toThrow(RuleOverridesInvalidError);
    await expect(failure).rejects.toThrow(/does not satisfy rule-overrides\.schema\.json/);
    await expect(failure).rejects.toThrow(/enabeld/);
  });

  it('an override with a rationale but no delta is a schema violation (anyOf enabled/severity/blocking)', async () => {
    const bad = JSON.stringify({
      tenantId: 'acme',
      version: '1.0.0',
      effectiveDate: '2026-09-01',
      approvedBy: 'x',
      rules: { 'ACL-02': { rationale: 'says nothing' } },
    });
    const loader = new RuleOverridesLoader(fakeFs({ ...CORPUS_FILES, '/sat/o.json': bad }, CORPUS_DIRS));
    await expect(loader.load('/sat', 'o.json', CORE)).rejects.toThrow(/does not satisfy/);
  });

  it('a corpus that ships no schema cannot validate — refused rather than applied on faith', async () => {
    const loader = new RuleOverridesLoader(
      fakeFs(
        { '/core/src/rulesets/acl/a.rules.json': '{}', '/sat/o.json': REAL_EXAMPLE },
        ['/core/src/rulesets', '/core/src/rulesets/acl'],
      ),
    );
    await expect(loader.load('/sat', 'o.json', CORE)).rejects.toThrow(/rule-overrides\.schema\.json was not readable/);
  });

  it('carries SCHEMA_INVALID as its code and is matchable by name across packages', () => {
    const err = new RuleOverridesInvalidError('x');
    expect(err.name).toBe('RuleOverridesInvalidError');
    expect(err.code).toBe('SCHEMA_INVALID');
  });
});
