#!/usr/bin/env node
/** Validate all ADR rulesets (handcrafted + generated) against the ruleset-standard schema using ajv. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const SCHEMA = JSON.parse(readFileSync(join(REPO_ROOT, 'src', 'rulesets', 'schema', 'ruleset-standard.schema.json'), 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(SCHEMA);

const dirs = [join(REPO_ROOT, 'src', 'rulesets', 'adr'), join(REPO_ROOT, 'src', 'rulesets', 'adr', 'generated')];
let files = [];
for (const d of dirs) {
  if (!existsSync(d)) continue;
  for (const n of readdirSync(d)) if (n.endsWith('.rules.json')) files.push(join(d, n));
}

let ok = 0, bad = 0;
for (const f of files) {
  const data = JSON.parse(readFileSync(f, 'utf8'));
  if (validate(data)) ok++;
  else {
    bad++;
    console.error(`INVALID ${f}`);
    console.error(JSON.stringify(validate.errors, null, 2));
  }
}
console.log(`ajv validation: ${ok} valid, ${bad} invalid, ${files.length} total`);
process.exit(bad === 0 ? 0 : 1);
