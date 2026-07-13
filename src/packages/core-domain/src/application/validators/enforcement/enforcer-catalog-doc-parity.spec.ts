/**
 * Reproducible toolchain — catalog ↔ doc parity + EXACT version pinning (GT-519 · EAG-14).
 *
 * The enforcer toolchain is only reproducible if the two sources of truth agree and every
 * version is an exact pin:
 *
 *   1. `product/infra/validated-tool-catalog.md` §4.3 "Architecture Enforcement (Boundary
 *      Analyzers)" — the human-facing table.
 *   2. `src/rulesets/enforcement/enforcer-catalog.json` — the machine-readable mirror the
 *      engine loads.
 *
 * This suite parses BOTH and fails on ANY drift between them (a version bumped in one file
 * but not the other is exactly how a CI image silently diverges from the certified pin), and
 * it fails if any version is not an EXACT `x.y.z` semver — a `16.x` / `^16` / `>=16` range
 * makes the built image non-reproducible. Renovate (deploy-gated) keeps the pins current;
 * this guard keeps the two files honest with each other in the meantime.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

/** Exact three-part semver, no ranges/wildcards/operators. */
const EXACT_SEMVER = /^\d+\.\d+\.\d+$/;

interface CatalogEntry {
  readonly tool: string;
  readonly runtime: string;
  readonly version: string;
  readonly adr: string;
}

const repoRoot = resolve(__dirname, '..', '..', '..', '..', '..', '..', '..');

function loadJsonCatalog(): CatalogEntry[] {
  const catalogPath = resolve(repoRoot, 'src', 'rulesets', 'enforcement', 'enforcer-catalog.json');
  return (JSON.parse(readFileSync(catalogPath, 'utf8')).enforcers as CatalogEntry[]).map((e) => ({
    tool: e.tool,
    runtime: e.runtime,
    version: e.version,
    adr: e.adr,
  }));
}

/**
 * Parse the §4.3 table from the validated-tool-catalog markdown. Rows look like:
 *   `| **dependency-cruiser** | 16.10.4 | node | … | … | ADR-0002 |`
 * We key by tool and read the version (col 2), runtime (col 3), ADR (last col).
 */
function loadDocCatalog(): Map<string, { version: string; runtime: string; adr: string }> {
  const docPath = resolve(repoRoot, 'product', 'infra', 'validated-tool-catalog.md');
  const md = readFileSync(docPath, 'utf8');

  const sectionStart = md.indexOf('### 4.3 Architecture Enforcement');
  if (sectionStart < 0) throw new Error('§4.3 Architecture Enforcement section not found in validated-tool-catalog.md');
  // The section runs until the next `---` horizontal rule or `## ` heading.
  const rest = md.slice(sectionStart);
  const endRel = rest.search(/\n---\n|\n## /);
  const section = endRel < 0 ? rest : rest.slice(0, endRel);

  const rows = new Map<string, { version: string; runtime: string; adr: string }>();
  for (const line of section.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = trimmed.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
    // Header (`Tool`) and separator (`----`) rows are skipped.
    if (cells.length < 6) continue;
    const tool = cells[0].replace(/\*/g, '').trim();
    if (tool === 'Tool' || /^-+$/.test(tool)) continue;
    rows.set(tool, { version: cells[1], runtime: cells[2], adr: cells[cells.length - 1] });
  }
  return rows;
}

describe('enforcer toolchain — catalog.json ↔ validated-tool-catalog.md parity + exact pinning (GT-519)', () => {
  const jsonCatalog = loadJsonCatalog();
  const docCatalog = loadDocCatalog();

  it('parses a non-empty table from each source', () => {
    expect(jsonCatalog.length).toBeGreaterThan(0);
    expect(docCatalog.size).toBeGreaterThan(0);
  });

  it('lists exactly the same set of tools in both files (no orphan on either side)', () => {
    const jsonTools = jsonCatalog.map((e) => e.tool).sort();
    const docTools = [...docCatalog.keys()].sort();
    expect(jsonTools).toEqual(docTools);
  });

  it('agrees on version + runtime + adr for every tool (fails on drift)', () => {
    for (const entry of jsonCatalog) {
      const doc = docCatalog.get(entry.tool);
      expect(doc).toBeDefined();
      expect({ tool: entry.tool, version: doc!.version, runtime: doc!.runtime, adr: doc!.adr })
        .toEqual({ tool: entry.tool, version: entry.version, runtime: entry.runtime, adr: entry.adr });
    }
  });

  it('pins every version EXACTLY (x.y.z — no ranges/wildcards) in BOTH files', () => {
    for (const entry of jsonCatalog) {
      expect(entry.version).toMatch(EXACT_SEMVER);
    }
    for (const [, row] of docCatalog) {
      expect(row.version).toMatch(EXACT_SEMVER);
    }
  });
});
