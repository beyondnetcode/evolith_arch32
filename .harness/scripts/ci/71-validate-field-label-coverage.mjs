#!/usr/bin/env node
/**
 * Every field the corpus PUBLISHES has a Spanish name, and every Spanish name names a field.
 *
 * WHY THIS EXISTS. The field labels the Core publishes become the labels of a form in whatever
 * consumes them, and one of the two languages is written down rather than derived: an English key
 * yields an English label by construction, and no amount of string-splitting yields Spanish. So the
 * Spanish lives in a glossary — and a glossary drifts silently in both directions.
 *
 * A field added to a schema with no entry here reaches a Spanish reader with an English name. That
 * is not a crash; it is a form that is half-translated, which nobody notices until a customer does.
 * An entry left behind after its field is renamed is the same rot facing the other way: it looks
 * like coverage and translates nothing.
 *
 * Both are invisible to every other check in this repository, which is the whole reason for this
 * one.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCHEMA_DIR = path.join(ROOT, 'src', 'rulesets', 'schema');
const GLOSSARY = path.join(ROOT, 'src', 'rulesets', 'i18n', 'field-labels.es.json');

/**
 * The leaf field names the corpus publishes.
 *
 * It mirrors the derivation deliberately — arrays and `$`-prefixed plumbing are not published, so
 * demanding a translation for them would be demanding words nobody will ever read.
 */
export function fieldNamesIn(schemas) {
  const names = new Map();

  const walk = (node, file) => {
    if (!node?.properties) return;
    for (const [key, child] of Object.entries(node.properties)) {
      const type = Array.isArray(child.type) ? child.type.find((t) => t !== 'null') : child.type;
      if (type === 'array' || key.startsWith('$')) continue;
      if (type === 'object' && child.properties) {
        walk(child, file);
        continue;
      }
      if (!names.has(key)) names.set(key, new Set());
      names.get(key).add(file);
    }
  };

  for (const [file, schema] of Object.entries(schemas)) walk(schema, file);
  return names;
}

/** What is wrong, as data — so the guard can print it and a test can assert it. */
export function coverageProblems(published, glossary) {
  return {
    untranslated: [...published.keys()].filter((k) => !glossary[k]).sort(),
    orphans: Object.keys(glossary).filter((k) => !published.has(k)).sort(),
    blank: Object.entries(glossary)
      .filter(([, v]) => !String(v ?? '').trim())
      .map(([k]) => k)
      .sort(),
  };
}

function publishedFieldNames() {
  const names = new Map();

  const walk = (node, file) => {
    if (!node?.properties) return;
    for (const [key, child] of Object.entries(node.properties)) {
      const type = Array.isArray(child.type) ? child.type.find((t) => t !== 'null') : child.type;
      if (type === 'array' || key.startsWith('$')) continue;
      if (type === 'object' && child.properties) {
        walk(child, file);
        continue;
      }
      if (!names.has(key)) names.set(key, new Set());
      names.get(key).add(file);
    }
  };

  for (const file of readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.json'))) {
    try {
      walk(JSON.parse(readFileSync(path.join(SCHEMA_DIR, file), 'utf8')), file);
    } catch {
      // A schema that does not parse is another guard's business; it is not evidence about labels.
    }
  }

  return names;
}

function main() {
  if (!existsSync(GLOSSARY)) {
    console.error(`✗ missing ${path.relative(ROOT, GLOSSARY)}`);
    process.exit(1);
  }

  const glossary = JSON.parse(readFileSync(GLOSSARY, 'utf8'));
  const published = publishedFieldNames();
  const { untranslated, orphans, blank } = coverageProblems(published, glossary);

  for (const key of untranslated) {
    const where = [...published.get(key)].slice(0, 3).join(', ');
    console.error(`✗ no Spanish name for "${key}" — published by ${where}`);
  }
  for (const key of orphans) {
    console.error(`✗ "${key}" is translated but no schema publishes it — a rename left it behind`);
  }
  for (const key of blank) {
    console.error(`✗ "${key}" has an empty Spanish name, which reads as a missing label, not a word`);
  }

  const failures = untranslated.length + orphans.length + blank.length;
  if (failures > 0) {
    console.error(
      `\n${failures} problem(s). Field names are the form a person fills in; half of them in the ` +
        `wrong language is not a partial translation, it is a broken screen.`,
    );
    process.exit(1);
  }

  console.log(`✓ ${published.size} published field names, all named in Spanish`);
}

// Importing this file for its functions must not run the guard.
if (process.argv[1] && process.argv[1].endsWith('71-validate-field-label-coverage.mjs')) main();
