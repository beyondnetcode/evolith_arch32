import {
  RULESETS_CORPUS_MARKERS,
  describeRulesetsResolutionFailure,
  entriesLookLikeCorpus,
  probeRulesetsLocation,
  probeRulesetsLocationSync,
  rulesetsCandidatePaths,
} from './rulesets-location';

/**
 * GT-566. These pin the decision that the corpus resolvers share: a candidate
 * directory qualifies by its CONTENTS, never by its name existing.
 */
describe('rulesets-location', () => {
  describe('rulesetsCandidatePaths', () => {
    it('probes <core>/rulesets before <core>/src/rulesets', () => {
      expect(rulesetsCandidatePaths('/core')).toEqual([
        '/core/rulesets',
        '/core/src/rulesets',
      ]);
    });

    it('does not double the separator on a trailing-slash core path', () => {
      expect(rulesetsCandidatePaths('/core/')).toEqual([
        '/core/rulesets',
        '/core/src/rulesets',
      ]);
    });
  });

  describe('entriesLookLikeCorpus', () => {
    it('accepts a directory holding a canonical family', () => {
      expect(entriesLookLikeCorpus(['schema', 'architecture'])).toBe(true);
      expect(entriesLookLikeCorpus(['topologies'])).toBe(true);
    });

    it('accepts a directory holding a *.rules.json directly', () => {
      expect(entriesLookLikeCorpus(['whatever.rules.json'])).toBe(true);
    });

    it('REJECTS a directory holding only agents — the bug in one line', () => {
      // `agents` must never be a corpus marker: `<repo>/rulesets/agents` is the
      // satellite-side agents directory, and treating it as a corpus is exactly
      // what shadowed `<repo>/src/rulesets`.
      expect(entriesLookLikeCorpus(['agents'])).toBe(false);
      expect(RULESETS_CORPUS_MARKERS.has('agents')).toBe(false);
    });

    it('rejects an empty directory', () => {
      expect(entriesLookLikeCorpus([])).toBe(false);
    });
  });

  /** Builds a probe fs over a `dir -> entries` map. */
  function makeProbeFs(tree: Record<string, string[]>) {
    return {
      exists: async (p: string) => p in tree,
      readdirNames: async (p: string) => tree[p] ?? [],
      existsSync: (p: string) => p in tree,
      readdirNamesSync: (p: string) => tree[p] ?? [],
    };
  }

  const MONOREPO = {
    '/repo/rulesets': ['agents'],
    '/repo/src/rulesets': ['schema', 'architecture', 'topologies'],
  };

  describe('probeRulesetsLocation', () => {
    it('skips an existing-but-empty rulesets/ and resolves src/rulesets', async () => {
      const { rulesetsRoot, probes } = await probeRulesetsLocation(
        '/repo',
        makeProbeFs(MONOREPO),
      );
      expect(rulesetsRoot).toBe('/repo/src/rulesets');
      // The trail records that the first candidate existed and was rejected —
      // that distinction is what the error message is built from.
      expect(probes[0]).toMatchObject({
        path: '/repo/rulesets',
        exists: true,
        isCorpus: false,
      });
    });

    it('stops at <core>/rulesets when it IS the corpus (bundled CLI layout)', async () => {
      const { rulesetsRoot } = await probeRulesetsLocation(
        '/pkg',
        makeProbeFs({ '/pkg/rulesets': ['schema', 'agents', 'architecture'] }),
      );
      expect(rulesetsRoot).toBe('/pkg/rulesets');
    });

    it('returns no root, with a full probe trail, when nothing qualifies', async () => {
      const { rulesetsRoot, probes } = await probeRulesetsLocation(
        '/nowhere',
        makeProbeFs({}),
      );
      expect(rulesetsRoot).toBeUndefined();
      expect(probes.map((p) => p.path)).toEqual([
        '/nowhere/rulesets',
        '/nowhere/src/rulesets',
      ]);
      expect(probes.every((p) => !p.exists)).toBe(true);
    });

    it('treats an unreadable directory as non-corpus rather than crashing', async () => {
      const { rulesetsRoot } = await probeRulesetsLocation('/x', {
        exists: async (p: string) => p === '/x/rulesets' || p === '/x/src/rulesets',
        readdirNames: async (p: string) => {
          if (p === '/x/rulesets') throw new Error('EACCES');
          return ['schema'];
        },
      });
      expect(rulesetsRoot).toBe('/x/src/rulesets');
    });
  });

  describe('probeRulesetsLocationSync', () => {
    it('behaves identically to the async twin', () => {
      expect(probeRulesetsLocationSync('/repo', makeProbeFs(MONOREPO)).rulesetsRoot).toBe(
        '/repo/src/rulesets',
      );
    });
  });

  describe('describeRulesetsResolutionFailure', () => {
    it('names every path tried when nothing exists', () => {
      const { probes } = probeRulesetsLocationSync('/nowhere', makeProbeFs({}));
      const msg = describeRulesetsResolutionFailure('/nowhere', probes);
      expect(msg).toContain('/nowhere/rulesets');
      expect(msg).toContain('/nowhere/src/rulesets');
      expect(msg).toContain('does not exist');
      expect(msg).toContain('Point CORE_PATH');
    });

    it('diagnoses a wrong LAYOUT when a candidate exists but is not a corpus', () => {
      const { probes } = probeRulesetsLocationSync(
        '/decoy',
        makeProbeFs({ '/decoy/rulesets': ['agents'] }),
      );
      const msg = describeRulesetsResolutionFailure('/decoy', probes);
      expect(msg).toContain('EXISTS but is not a ruleset corpus');
      expect(msg).toContain('it contains: agents');
      expect(msg).toContain('The layout is likely wrong');
      // Says where the real corpus lives, so the reader can act.
      expect(msg).toContain('src/rulesets');
    });
  });
});
