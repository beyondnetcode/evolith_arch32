import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateKnowledgeIntake } from './17-validate-knowledge-intake.mjs';

test('accepts the governed Evans pilot candidate', () => {
  assert.deepEqual(validateKnowledgeIntake(process.cwd()).errors, []);
});

function write(root, file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
}

test('rejects a candidate without Winston review ownership', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-knowledge-intake-'));
  write(root, 'src/rulesets/schema/knowledge-intake.schema.json', fs.readFileSync('src/rulesets/schema/knowledge-intake.schema.json', 'utf8'));
  write(root, 'src/rulesets/schema/source-registry.schema.json', fs.readFileSync('src/rulesets/schema/source-registry.schema.json', 'utf8'));
  write(root, 'reference/architecture/topologies/progressive-axis/modular-monolith/topology.manifest.json', { apiVersion: 'evolith.dev/topology/v1', kind: 'TopologyManifest', metadata: { id: 'modular-monolith', status: 'accepted' }, spec: { artifacts: { adrs: [], rulesets: [], opaPolicies: [], aiRulesets: [], umsContracts: [] }, operationalInterfaces: { cli: { validators: [] }, mcp: { resources: [], tools: [], prompts: [] }, coreApi: { endpoints: [] } } }, businessBoundary: { technicalOnly: true, trackerOwns: ['timing', 'ownership', 'prioritization', 'roi', 'cost', 'budget', 'funnel-0'] } });
  write(root, 'reference/knowledge/intake/KI-TEST-001.yaml', 'knowledge_id: KI-TEST-001\nsource_registry_id: SRC-TEST-001\nsource:\n  class: book\n  author: A\n  work: B\n  locator: C\n  retrieved_at: "2026-06-20"\n  rights_status: citation-and-synthesis-only\nassessment:\n  trust_level: primary\n  portability: high\n  topologies: [modular-monolith]\n  maturity: proven\n  concerns: [domain-modeling]\npromotion:\n  status: candidate\nreview:\n  owner: "@other"\n  next_review_at: "2026-12-20"\n  review_freshness: "2026-06-20"\nsynthesis: This is an original synthesis long enough to satisfy the required contract.\n');
  assert.match(validateKnowledgeIntake(root).errors.join('\n'), /must be equal to constant/);
});

test('rejects a candidate with unknown topology ID', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-knowledge-intake-unknown-topology-'));
  write(root, 'src/rulesets/schema/knowledge-intake.schema.json', fs.readFileSync('src/rulesets/schema/knowledge-intake.schema.json', 'utf8'));
  write(root, 'src/rulesets/schema/source-registry.schema.json', fs.readFileSync('src/rulesets/schema/source-registry.schema.json', 'utf8'));
  write(root, 'reference/architecture/topologies/progressive-axis/valid-topology/topology.manifest.json', { apiVersion: 'evolith.dev/topology/v1', kind: 'TopologyManifest', metadata: { id: 'valid-topology', status: 'accepted' }, spec: { artifacts: { adrs: [], rulesets: [], opaPolicies: [], aiRulesets: [], umsContracts: [] }, operationalInterfaces: { cli: { validators: [] }, mcp: { resources: [], tools: [], prompts: [] }, coreApi: { endpoints: [] } } }, businessBoundary: { technicalOnly: true, trackerOwns: ['timing', 'ownership', 'prioritization', 'roi', 'cost', 'budget', 'funnel-0'] } });
  write(root, 'reference/knowledge/intake/KI-TEST-002.yaml', 'knowledge_id: KI-TEST-002\nsource_registry_id: SRC-TEST-002\nsource:\n  class: book\n  author: A\n  work: B\n  locator: C\n  retrieved_at: "2026-06-20"\n  rights_status: citation-and-synthesis-only\nassessment:\n  trust_level: primary\n  portability: high\n  topologies: [nonexistent-topology]\n  maturity: proven\n  preconditions: [x]\n  anti_patterns: [y]\n  alternatives: [z]\n  concerns: [domain-modeling]\npromotion:\n  status: candidate\nreview:\n  owner: "@winston"\n  next_review_at: "2026-12-20"\n  review_freshness: "2026-06-20"\nsynthesis: This is an original synthesis long enough to satisfy the required contract.\n');
  assert.match(validateKnowledgeIntake(root).errors.join('\n'), /not a known accepted topology/);
});
