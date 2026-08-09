#!/usr/bin/env node
/**
 * GT-662 — compile the ISO/IEC 5055 weakness index INTO the domain package.
 *
 * The index is authored as JSON under `src/rulesets/standards/`, which is where
 * a human edits it and where the corpus tooling reads it. But a domain module
 * that `require`s it by relative path is depending on where a corpus file lives,
 * and that is not stable: the core-api image copies `src/rulesets` to
 * `/app/corpus/rulesets`, so the baked-in path does not exist at runtime and the
 * service dies at boot. The chaos drill caught exactly that.
 *
 * So the JSON stays the source of truth and this emits a compiled-in copy.
 * `iso-5055-index.spec.ts` fails if the two ever disagree.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = join(ROOT, 'src/rulesets/standards/iso-5055-weaknesses.json');
const TARGET = join(ROOT, 'src/packages/core-domain/src/application/validators/standards/iso-5055-index.generated.ts');

const raw = JSON.parse(readFileSync(SOURCE, 'utf8'));
const distinct = new Set(Object.values(raw.measures).flat());
if (distinct.size !== raw.standard?.weaknessCount) {
  console.error(
    `✗ generate-iso-5055-index: the index holds ${distinct.size} distinct CWEs but declares ` +
    `${raw.standard?.weaknessCount}. Refusing to compile in an index that disagrees with itself.`,
  );
  process.exit(1);
}

const header = readFileSync(TARGET, 'utf8').split('export const')[0];
writeFileSync(
  TARGET,
  `${header}export const ISO_5055_WEAKNESS_INDEX = ${JSON.stringify({ standard: raw.standard, measures: raw.measures }, null, 2)} as const;\n`,
);
console.log(`✓ generate-iso-5055-index: ${distinct.size} distinct CWE(s) across ${Object.keys(raw.measures).length} measure(s).`);
