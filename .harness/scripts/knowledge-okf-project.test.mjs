import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBundle,
  okfConformance,
  diffBundle,
  readAsOf,
  parseFrontmatter,
  stripFrontmatter,
  dumpFrontmatter,
  slugify,
  titleFromBody,
  OKF_VERSION,
} from './knowledge-okf-project.mjs';

// ── Fixtures: un Knowledge OS mínimo pero representativo ──────────────────────
const INDEX = {
  metadata: { id: 'evolith-core', version: '0.1.0', status: 'draft' },
  spec: {
    product: 'canonical/product.yaml',
    packs: [{ id: 'knowledge-and-corpus', layer: 'L2', manifest: 'canonical/packs/knowledge-and-corpus.pack.yaml', dependsOn: [] }],
  },
};
const PRODUCT = {
  metadata: { id: 'evolith-core', owner: '@winston', reviewBy: '2027-01-06' },
  spec: {
    name: 'Evolith Core',
    role: 'root-authority',
    statement: 'Evolith Core es el repositorio raíz.',
    responsibilityModel: 'Core defines. Providers execute.',
    exposure: { rest: '/api/v1' },
  },
};
const PACK = {
  metadata: { id: 'knowledge-and-corpus', version: '0.2.0', status: 'draft', owner: '@winston', reviewBy: '2026-10-06' },
  spec: {
    boundedContext: 'ctx.knowledge',
    applicability: { stack: ['nodejs'], topologies: { composableWith: ['agentic-ai'] } },
    authored: { domain: [], glossary: ['canonical/glossary/knowledge.md'], prompts: [] },
    references: { adrs: ['ADR-0069', 'ADR-0074'], schemas: ['src/rulesets/schema/knowledge-intake.schema.json'] },
  },
};
const GLOSSARY = `---
id: glossary.knowledge
owner: "@winston"
reviewBy: "2026-10-06"
---

# Glosario — Knowledge & Corpus

- **Knowledge Pack** — manifiesto de composición.
`;

function build(asOf = '2026-07-07') {
  const loadYaml = (rel) => {
    if (rel === 'canonical/product.yaml') return PRODUCT;
    if (rel === 'canonical/packs/knowledge-and-corpus.pack.yaml') return PACK;
    throw new Error(`unexpected yaml: ${rel}`);
  };
  const readText = (rel) => {
    if (rel === 'canonical/glossary/knowledge.md') return GLOSSARY;
    throw new Error(`unexpected text: ${rel}`);
  };
  return buildBundle({ index: INDEX, loadYaml, readText, asOf });
}

test('slugify normaliza ids a kebab-case seguro', () => {
  assert.equal(slugify('ADR-0074'), 'adr-0074');
  assert.equal(slugify('canonical/glossary/knowledge'), 'canonical-glossary-knowledge');
});

test('dumpFrontmatter omite vacíos y produce un bloque parseable', () => {
  const fm = dumpFrontmatter({ type: 'Glossary', title: 'X', description: '', tags: [], owner: '@w' });
  const { data, body } = parseFrontmatter(fm);
  assert.equal(body, '');
  assert.deepEqual(data, { type: 'Glossary', title: 'X', owner: '@w' });
});

test('stripFrontmatter conserva el cuerpo y titleFromBody lee el H1', () => {
  const body = stripFrontmatter(GLOSSARY);
  assert.ok(body.startsWith('# Glosario'));
  assert.equal(titleFromBody(body, 'fallback'), 'Glosario — Knowledge & Corpus');
});

test('el bundle emite producto, pack, concepto, refs y todos los reservados', () => {
  const files = build();
  const paths = files.map((f) => f.path).sort();
  assert.ok(paths.includes('index.md'));
  assert.ok(paths.includes('log.md'));
  assert.ok(paths.includes('product.md'));
  assert.ok(paths.includes('packs/index.md'));
  assert.ok(paths.includes('packs/knowledge-and-corpus.md'));
  assert.ok(paths.includes('concepts/index.md'));
  assert.ok(paths.includes('concepts/glossary-knowledge.md'));
  assert.ok(paths.includes('refs/index.md'));
  assert.ok(paths.includes('refs/adr-0069.md'));
  assert.ok(paths.includes('refs/adr-0074.md'));
  assert.ok(paths.some((p) => p.startsWith('refs/knowledge-intake')));
});

test('el bundle generado es 100% conforme a OKF v0.1', () => {
  const violations = okfConformance(build());
  assert.deepEqual(violations, [], JSON.stringify(violations));
});

test('todo concepto no reservado tiene `type` no vacío', () => {
  for (const f of build()) {
    const base = f.path.split('/').pop();
    if (base === 'index.md' || base === 'log.md') continue;
    const { data } = parseFrontmatter(f.content);
    assert.ok(data && data.type && String(data.type).trim(), `${f.path} sin type`);
  }
});

test('el concepto rehidrata el cuerpo desde la fuente y preserva provenance', () => {
  const concept = build().find((f) => f.path === 'concepts/glossary-knowledge.md');
  const { data, body } = parseFrontmatter(concept.content);
  assert.equal(data.type, 'Glossary');
  assert.equal(data.resource, 'reference/knowledge/canonical/glossary/knowledge.md');
  assert.equal(data.owner, '@winston'); // provenance preservada como extensión
  assert.ok(body.includes('Knowledge Pack')); // cuerpo autoral real, no frontmatter fuente
  assert.ok(!body.includes('glossary.knowledge')); // el frontmatter fuente fue removido
});

test('los cross-links son absolutos desde la raíz del bundle', () => {
  const pack = build().find((f) => f.path === 'packs/knowledge-and-corpus.md');
  assert.ok(pack.content.includes('](/concepts/glossary-knowledge.md)'));
  assert.ok(pack.content.includes('](/refs/adr-0074.md)'));
  const product = build().find((f) => f.path === 'product.md');
  assert.ok(product.content.includes('](/packs/knowledge-and-corpus.md)'));
});

test('el nodo de referencia acumula backlinks referencedBy', () => {
  const adr = build().find((f) => f.path === 'refs/adr-0074.md');
  const { data, body } = parseFrontmatter(adr.content);
  assert.equal(data.type, 'ADR');
  assert.equal(data.resource, 'evolith://adr/ADR-0074');
  assert.ok(body.includes('/packs/knowledge-and-corpus.md'));
});

test('index.md y log.md son reservados (sin frontmatter, fecha ISO en log)', () => {
  const files = build('2026-07-07');
  const index = files.find((f) => f.path === 'index.md');
  const log = files.find((f) => f.path === 'log.md');
  assert.equal(parseFrontmatter(index.content).data, null);
  assert.ok(log.content.includes('## 2026-07-07'));
  assert.ok(log.content.includes(`OKF v${OKF_VERSION}`));
});

test('la proyección es determinista para las mismas entradas', () => {
  assert.deepEqual(build('2026-07-07'), build('2026-07-07'));
});

test('readAsOf recupera la fecha del log.md publicado', () => {
  const log = build().find((f) => f.path === 'log.md').content;
  assert.equal(readAsOf(log), '2026-07-07');
  assert.equal(readAsOf('sin fecha'), null);
});

test('diffBundle no reporta deriva cuando el disco coincide con lo construido', () => {
  const files = build();
  const existing = new Map(files.map((f) => [f.path, f.content]));
  assert.deepEqual(diffBundle(files, existing), []);
});

test('diffBundle detecta changed, missing y orphan', () => {
  const files = build();
  const existing = new Map(files.map((f) => [f.path, f.content]));
  existing.set('product.md', '# editado a mano'); // changed
  existing.delete('log.md'); // missing en disco
  existing.set('refs/zzz-huerfano.md', '---\ntype: X\n---\n'); // orphan
  const drift = diffBundle(files, existing);
  const byKind = Object.fromEntries(drift.map((d) => [d.path, d.kind]));
  assert.equal(byKind['product.md'], 'changed');
  assert.equal(byKind['log.md'], 'missing');
  assert.equal(byKind['refs/zzz-huerfano.md'], 'orphan');
});
