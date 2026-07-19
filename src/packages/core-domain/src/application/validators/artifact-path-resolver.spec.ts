import * as path from 'node:path';
import { resolveArtifactPath } from './artifact-path-resolver';

const SAT = path.join('/', 'sat');
const CORE = path.join('/', 'core');

describe('resolveArtifactPath', () => {
  it('resolves a satellite-native artifact under the satellite root', () => {
    expect(resolveArtifactPath('PRD', SAT)).toBe(path.join(SAT, 'docs', 'prd.md'));
  });

  it('prefers the satellite tier over the Core template tier', () => {
    // Even with a corePath available, a PRD must resolve to the satellite's own
    // docs/prd.md — never to Core's prd-template.md.
    expect(resolveArtifactPath('PRD', SAT, CORE)).toBe(path.join(SAT, 'docs', 'prd.md'));
  });

  it('falls back to the Core template only for artifacts with no satellite path', () => {
    expect(resolveArtifactPath('Canonical Patterns', SAT)).toBe(
      path.join(SAT, 'docs', 'architecture', 'canonical-patterns'),
    );
    // "Documentation Delta" has both tiers; the satellite one still wins.
    expect(resolveArtifactPath('Documentation Delta', SAT, CORE)).toBe(
      path.join(SAT, 'docs', 'documentation-delta'),
    );
  });

  it('never invents a template path when corePath is absent', () => {
    // Unknown artifact + no corePath => satellite-relative last resort only.
    expect(resolveArtifactPath('Nonexistent Artifact', SAT)).toBe(
      path.join(SAT, 'Nonexistent Artifact'),
    );
  });

  it('treats literal repo-relative artifact names as satellite-relative', () => {
    expect(resolveArtifactPath('README.md', SAT)).toBe(path.join(SAT, 'README.md'));
    expect(resolveArtifactPath('.evolith/moscow/phase-0.json', SAT)).toBe(
      path.join(SAT, '.evolith', 'moscow', 'phase-0.json'),
    );
  });
});
