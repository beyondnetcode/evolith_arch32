import * as fs from 'fs';
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule, blueprintExists } from './app.module';
import { REPO_ROOT } from './test-support/repo-root';

describe('AppModule', () => {
  it('should compile the module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    expect(module).toBeDefined();
  });
});

/**
 * GT-632 — `blueprintExists` backs the blueprint kind evaluator, and it answers
 * with `fs.existsSync`. A base directory that no longer exists therefore does
 * not fail: it makes EVERY blueprint reference resolve to "not found", a
 * confident wrong verdict that looks identical to a genuine miss.
 *
 * The base is asserted against the real checkout on purpose. A fixture would
 * only prove the function agrees with the fixture.
 */
describe('blueprintExists against the real Core checkout', () => {
  const blueprints = path.join(REPO_ROOT, 'reference', 'core', 'architecture', 'blueprints');

  it('looks in a directory that exists and holds blueprint documents', () => {
    expect(fs.existsSync(blueprints)).toBe(true);
    const docs = fs.readdirSync(blueprints).filter((f) => f.endsWith('.md'));
    expect(docs.length).toBeGreaterThan(0);
  });

  it('resolves a real blueprint by filename and by bare name', async () => {
    const docs = fs.readdirSync(blueprints).filter((f) => f.endsWith('.md') && !f.endsWith('.es.md'));
    expect(docs.length).toBeGreaterThan(0);
    const sample = docs[0];

    await expect(blueprintExists(REPO_ROOT, sample)).resolves.toBe(true);
    await expect(blueprintExists(REPO_ROOT, sample.replace(/\.md$/, ''))).resolves.toBe(true);
  });

  it('still says no to a blueprint that does not exist', async () => {
    // Without this the test above could pass on a function that always returns
    // true, which is the other way to be uselessly green.
    await expect(blueprintExists(REPO_ROOT, 'no-such-blueprint-gt632')).resolves.toBe(false);
  });
});
