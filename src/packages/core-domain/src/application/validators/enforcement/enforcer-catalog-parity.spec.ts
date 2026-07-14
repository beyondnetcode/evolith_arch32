/**
 * Anti-drift parity: enforcer-catalog.json  ↔  the implemented enforcer adapters
 * (GT-524 · axis 2 / GT-514 · EAG-08).
 *
 * `src/rulesets/enforcement/enforcer-catalog.json` is the machine-readable mirror of
 * §4.3 "Architecture Enforcement (Boundary Analyzers)" of the validated-tool-catalog.
 * The catalog is intentionally BROADER than the code: it lists every runtime we intend
 * to support, but only some tools have a concrete adapter today. This suite freezes that
 * relationship so drift is caught mechanically:
 *
 *   - Every IMPLEMENTED adapter (dependency-cruiser · GT-515; NetArchTest · GT-524) MUST
 *     appear in the catalog with the SAME `tool` and `runtime` — an adapter-without-catalog
 *     entry fails here.
 *   - The catalog MAY list tools that have no adapter yet (Deptrac / import-linter /
 *     Conftest — GT-521). That set is modeled explicitly as PLANNED and does not fail; a
 *     catalogued-tool-without-adapter that is NOT in PLANNED does fail (the anti-drift point).
 *   - Every catalog entry must be well-formed: non-empty `tool`, `runtime` ∈ EnforcerRuntime,
 *     non-empty `adr`.
 *
 * The implemented set is DERIVED by constructing each adapter over a StubProcessRunner and
 * reading its `.tool` / `.runtime` (plus the exported DEPENDENCY_CRUISER_TOOL /
 * NETARCHTEST_TOOL constants) — never a loose string literal — so renaming a tool in code
 * without updating the catalog trips this test.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

import { StubProcessRunner, type EnforcerRuntime } from './enforcer.types';
import { createDependencyCruiserAdapter, DEPENDENCY_CRUISER_TOOL } from './adapters/dependency-cruiser-adapter';
import { createNetArchTestAdapter, NETARCHTEST_TOOL } from './adapters/netarchtest-adapter';
import { createImportLinterAdapter, IMPORT_LINTER_TOOL } from './adapters/import-linter-adapter';
import { createCheckovAdapter, createTrivyAdapter, CHECKOV_TOOL, TRIVY_TOOL } from './adapters/sarif-security-adapter';

interface CatalogEntry {
  readonly tool: string;
  readonly runtime: string;
  readonly version: string;
  readonly purpose: string;
  readonly outputFormat: string;
  readonly adr: string;
}

/** Every value of {@link EnforcerRuntime}. The Record shape forces this list to stay
 *  exhaustive: a new runtime in the union that is missing here fails to type-check. */
const VALID_RUNTIMES: Record<EnforcerRuntime, true> = {
  node: true,
  dotnet: true,
  php: true,
  python: true,
  iac: true,
  shell: true,
};
const isValidRuntime = (r: string): r is EnforcerRuntime =>
  Object.prototype.hasOwnProperty.call(VALID_RUNTIMES, r);

/** Tools catalogued for runtimes whose adapter awaits a real repo (GT-521 criterion #1). */
const PLANNED_WITHOUT_ADAPTER = ['Deptrac', 'Conftest'] as const;

/** Load the catalog straight from the repository (not a copy) so the test tracks the real file. */
function loadCatalog(): { enforcers: CatalogEntry[] } {
  const catalogPath = resolve(
    __dirname,
    '..', '..', '..', '..', '..', '..', '..',
    'src', 'rulesets', 'enforcement', 'enforcer-catalog.json',
  );
  return JSON.parse(readFileSync(catalogPath, 'utf8'));
}

/** The concrete adapters that exist today, with tool/runtime DERIVED from each instance. */
function implementedAdapters() {
  const runner = new StubProcessRunner();
  return [
    createDependencyCruiserAdapter(runner),
    createNetArchTestAdapter(runner),
    createImportLinterAdapter(runner),
    createCheckovAdapter(runner),
    createTrivyAdapter(runner),
  ].map((a) => ({
    tool: a.tool,
    runtime: a.runtime,
  }));
}

describe('enforcer-catalog ↔ adapters parity (GT-524 / GT-514 anti-drift)', () => {
  const catalog = loadCatalog();
  const enforcers = catalog.enforcers;
  const implemented = implementedAdapters();
  const catalogByTool = new Map(enforcers.map((e) => [e.tool, e]));

  it('exposes the implemented adapters via their exported tool constants (no loose literals)', () => {
    expect(implemented.map((i) => i.tool)).toEqual([DEPENDENCY_CRUISER_TOOL, NETARCHTEST_TOOL, IMPORT_LINTER_TOOL, CHECKOV_TOOL, TRIVY_TOOL]);
    // The .NET adapter's runtime is what makes GT-524 the ".NET" enforcer.
    expect(implemented.find((i) => i.tool === NETARCHTEST_TOOL)?.runtime).toBe('dotnet');
    expect(implemented.find((i) => i.tool === DEPENDENCY_CRUISER_TOOL)?.runtime).toBe('node');
  });

  it('lists every implemented adapter in the catalog with a matching tool + runtime', () => {
    for (const impl of implemented) {
      const entry = catalogByTool.get(impl.tool);
      expect(entry).toBeDefined();
      expect(entry!.runtime).toBe(impl.runtime);
    }
  });

  it('has NO catalogued tool without an adapter beyond the GT-521 planned set', () => {
    const implementedTools = new Set(implemented.map((i) => i.tool));
    const catalogedWithoutAdapter = enforcers
      .map((e) => e.tool)
      .filter((tool) => !implementedTools.has(tool));
    const planned = new Set<string>(PLANNED_WITHOUT_ADAPTER);
    // Every un-adapted catalog tool must be a KNOWN planned one — a new/misnamed cataloged
    // tool with no adapter (and not in PLANNED) fails here: that is the drift we guard.
    for (const tool of catalogedWithoutAdapter) {
      expect(planned.has(tool)).toBe(true);
    }
  });

  it('keeps the PLANNED set honest: each planned tool is actually catalogued', () => {
    for (const tool of PLANNED_WITHOUT_ADAPTER) {
      expect(catalogByTool.has(tool)).toBe(true);
    }
  });

  it('has a well-formed entry (non-empty tool, runtime ∈ EnforcerRuntime, non-empty adr) for every tool', () => {
    expect(enforcers.length).toBeGreaterThan(0);
    for (const entry of enforcers) {
      expect(typeof entry.tool).toBe('string');
      expect(entry.tool.trim().length).toBeGreaterThan(0);
      expect(isValidRuntime(entry.runtime)).toBe(true);
      expect(typeof entry.adr).toBe('string');
      expect(entry.adr.trim().length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate tool entries in the catalog', () => {
    const tools = enforcers.map((e) => e.tool);
    expect(new Set(tools).size).toBe(tools.length);
  });
});
