import { ISO_5055_WEAKNESS_INDEX } from './iso-5055-index.generated';
import { buildIso5055Index } from './iso-5055-measure';
import JSON_INDEX from '../../../../../../rulesets/standards/iso-5055-weaknesses.json';

/**
 * GT-662 — the compiled-in index must still equal the JSON it was generated from.
 *
 * The adapter used to `require` the JSON by relative path. That resolves inside
 * this repository and NOT inside the shipped image — the core-api Dockerfile
 * copies `src/rulesets` to `/app/corpus/rulesets` — so core-api died at boot
 * with MODULE_NOT_FOUND and `/health` never answered. The chaos drill was the
 * only thing that could catch it: every unit suite runs from the repo, where the
 * path works.
 *
 * Compiling the index in removes the runtime path entirely. The cost is a copy,
 * and this file is what stops the copy drifting: the JSON stays the thing a
 * human edits, and a divergence fails here rather than in production.
 *
 * The JSON is imported HERE, in a test, on purpose. A test may depend on the
 * repository layout; a domain module may not.
 */
describe('ISO/IEC 5055 compiled index · GT-662', () => {
  it('THE COPY IS FAITHFUL: the generated constant equals the JSON source', () => {
    expect(ISO_5055_WEAKNESS_INDEX.measures).toEqual((JSON_INDEX as { measures: unknown }).measures);
    expect(ISO_5055_WEAKNESS_INDEX.standard).toEqual((JSON_INDEX as { standard: unknown }).standard);
  });

  it('and it still builds the 138-weakness index the standard declares', () => {
    const index = buildIso5055Index(ISO_5055_WEAKNESS_INDEX);
    expect(index.size).toBe(138);
    expect(index.size).toBe(ISO_5055_WEAKNESS_INDEX.standard.weaknessCount);
  });

  it('carries NO runtime dependency on the corpus tree — the whole point', () => {
    // If this module ever reaches for a path again, the image breaks silently
    // and only a live-stack job notices. Asserted on the SOURCE text so the
    // regression is caught here rather than six minutes into a chaos drill.
    const src = require('node:fs').readFileSync(
      require('node:path').join(__dirname, '../enforcement/adapters/iso-5055-adapter.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/rulesets\/standards\/iso-5055-weaknesses\.json'/);
  });
});
