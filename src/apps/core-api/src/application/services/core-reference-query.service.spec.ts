import * as fs from 'fs';
import * as path from 'path';
import { CoreReferenceQueryService } from './core-reference-query.service';
import { NodeFileSystemProvider } from '@beyondnet/evolith-infra-providers';
import { REPO_ROOT } from '../../test-support/repo-root';

/**
 * GT-632 — pin the reference surface against the REAL repository layout.
 *
 * These assertions deliberately use the live filesystem and the live Core
 * checkout rather than a fixture tree. The defect this closes was two paths that
 * the `src/` refactor invalidated:
 *
 *   - `reference/architecture/topologies`     → `reference/core/architecture/topologies`
 *   - `rulesets/sdlc/phase-gates.rules.json`  → resolved via the GT-566 corpus probe
 *
 * Neither threw. `findRulesetFiles` answers `[]` for a directory that is not
 * there, so the query kept returning a plausible-looking, quietly incomplete
 * list. A fixture cannot catch that: a fixture encodes the layout the code
 * believes in, so the code and its tests agree with each other and neither
 * agrees with the repository. Only the repository is evidence.
 */
describe('CoreReferenceQueryService against the real Core checkout', () => {
  const service = new CoreReferenceQueryService(new NodeFileSystemProvider());

  /** Collect `*.rules.json` under a directory, mirroring the service's filter. */
  function rulesFilesUnder(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) rulesFilesUnder(full, out);
      else if (entry.name.endsWith('.rules.json')) out.push(full);
    }
    return out;
  }

  describe('the doc-side topology tree (GT-690: narrative only, no second corpus)', () => {
    const topologyDocs = path.join(REPO_ROOT, 'reference', 'core', 'architecture', 'topologies');

    it('still exists — the narrative pages, manifests and OPA policies live there', () => {
      expect(fs.existsSync(topologyDocs)).toBe(true);
    });

    it('carries NO rulesets any more: each progressive-axis ruleset exists in exactly one place', () => {
      // GT-690's falsifier, checked with `ls` rather than an import graph: a
      // second copy reappearing under the doc tree turns this red.
      expect(rulesFilesUnder(topologyDocs)).toEqual([]);
    });

    it('the surviving copies are listed from the corpus root under their canonical $id', async () => {
      const listedIds = (await service.listRulesets(REPO_ROOT)).map((r) => r.id);
      for (const topology of ['modular-monolith', 'distributed-modules', 'microservices']) {
        const file = path.join(REPO_ROOT, 'src', 'rulesets', 'topologies', 'progressive-axis', topology, `${topology}.rules.json`);
        const { $id } = JSON.parse(fs.readFileSync(file, 'utf8')) as { $id?: string };
        expect(typeof $id).toBe('string');
        expect(listedIds).toContain($id);
      }
    });
  });

  describe('the SDLC phase gates', () => {
    it('resolves the gates file through the corpus probe, not a hardcoded layout', async () => {
      // The authored corpus in this monorepo. `<core>/rulesets` — the layout the
      // pre-GT-632 first candidate named — does not exist here at all.
      expect(fs.existsSync(path.join(REPO_ROOT, 'src', 'rulesets', 'sdlc', 'phase-gates.rules.json'))).toBe(true);
      expect(fs.existsSync(path.join(REPO_ROOT, 'rulesets', 'sdlc', 'phase-gates.rules.json'))).toBe(false);

      const gate = await service.getGate(REPO_ROOT, 'PG1');
      expect(gate).toBeDefined();
      expect(gate?.phase).toBe(1);
    });

    it('answers phase requirements from the same corpus', async () => {
      const requirements = await service.getPhaseRequirements(REPO_ROOT, '1');
      expect(requirements?.phase).toBe(1);
    });

    it('fails closed rather than reporting "no such gate" when the corpus is unreachable', async () => {
      const nowhere = path.join(REPO_ROOT, 'this-directory-does-not-exist');
      // An empty gate list would surface as a 404 for a gate that exists,
      // blaming the caller for a misconfigured CORE_PATH.
      await expect(service.getGate(nowhere, 'PG1')).rejects.toThrow(/ruleset corpus/i);
    });
  });

  it('lists exactly the corpus root — one summary per ruleset file, no second tree (GT-690)', async () => {
    const corpusFiles = rulesFilesUnder(path.join(REPO_ROOT, 'src', 'rulesets'));
    expect(corpusFiles.length).toBeGreaterThan(0);

    const summaries = await service.listRulesets(REPO_ROOT);
    // Equality is the load-bearing part now: the doc tree used to add three
    // duplicates with a different `$id`, so `>` here would mean a copy came back.
    expect(summaries.length).toBe(corpusFiles.length);
  });
});
