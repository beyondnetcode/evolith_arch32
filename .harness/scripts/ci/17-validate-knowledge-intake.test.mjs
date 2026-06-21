import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateKnowledgeIntake } from './17-validate-knowledge-intake.mjs';

test('accepts the governed Evans pilot candidate', () => {
  assert.deepEqual(validateKnowledgeIntake(process.cwd()).errors, []);
});

test('rejects a candidate without Wilson review ownership', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-knowledge-intake-'));
  fs.mkdirSync(path.join(root, 'rulesets/schema'), { recursive: true });
  fs.mkdirSync(path.join(root, 'reference/knowledge/intake'), { recursive: true });
  fs.copyFileSync('rulesets/schema/knowledge-intake.schema.json', path.join(root, 'rulesets/schema/knowledge-intake.schema.json'));
  fs.writeFileSync(path.join(root, 'reference/knowledge/intake/KI-TEST-001.yaml'), 'knowledge_id: KI-TEST-001\nsource:\n  class: book\n  author: A\n  work: B\n  locator: C\n  retrieved_at: "2026-06-20"\n  rights_status: citation-and-synthesis-only\nassessment:\n  trust_level: primary\n  portability: high\n  topologies: [modular-monolith]\n  concerns: [domain-modeling]\npromotion:\n  status: candidate\nreview:\n  owner: "@other"\n  next_review_at: "2026-12-20"\nsynthesis: This is an original synthesis long enough to satisfy the required contract.\n');
  assert.match(validateKnowledgeIntake(root).errors.join('\n'), /must be equal to constant/);
});
