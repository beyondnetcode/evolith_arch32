#!/usr/bin/env node

/**
 * GT-620 — negative fixtures for the language heuristic.
 *
 * The defect: `reference/core/interfaces/using-the-cli.md`, the ENGLISH slot,
 * was written in Spanish and this suite passed it green, because comparing the
 * COUNT of `##`/`###` headings says nothing about the language they are in. An
 * untranslated file in the wrong slot is precisely what bilingual parity exists
 * to catch, and it was the one shape the gate could not see.
 *
 * Every test here is a case in which the heuristic MUST reach a verdict — or
 * MUST decline to, which matters just as much: a false accusation against a
 * legitimate document would be worse than the blind spot, because it would get
 * the check switched off.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { languageOf, proseOf } from '../../lib/language-heuristic.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../..');

const SPANISH = `
# Cómo usar la CLI de Evolith

Esta guía explica cómo se utiliza la interfaz de línea de comandos del producto.
El comando principal permite validar el repositorio, generar la documentación
base y comprobar las reglas de cada fase. Cuando la salida no es la esperada,
conviene revisar la ruta del archivo de configuración y el modo en el que se
está ejecutando, porque los mensajes dependen de ambos. También puedes pedir
ayuda con la opción correspondiente, que muestra todos los comandos.
`;

const ENGLISH = `
# How to use the Evolith CLI

This guide explains how the command line interface of the product is used. The
main command validates the repository, generates the base documentation and
checks the rules for each phase. When the output is not what you expected, it is
worth reviewing the path of the configuration file and the mode it is running
in, because the messages depend on both. You can also ask for help with the
matching option, which lists every command.
`;

test('a Spanish document is reported as Spanish', () => {
  const { verdict, es, en } = languageOf(SPANISH);
  assert.equal(verdict, 'es', `es=${es} en=${en}`);
});

test('an English document is reported as English', () => {
  const { verdict, es, en } = languageOf(ENGLISH);
  assert.equal(verdict, 'en', `es=${es} en=${en}`);
});

test('THE regression: the real English CLI guide reads as English', () => {
  // The file GT-620 was registered for. It is deliberately NOT in the suite's
  // baseline, so if it is ever replaced by Spanish again the gate goes red.
  const guide = readFileSync(join(REPO_ROOT, 'reference/core/interfaces/using-the-cli.md'), 'utf8');
  const { verdict, en, es } = languageOf(guide);
  assert.equal(verdict, 'en', `the English slot must read as English (en=${en} es=${es})`);
  assert.ok(en > es * 10, `expected an overwhelming English majority, got en=${en} es=${es}`);
});

test('its Spanish counterpart reads as Spanish', () => {
  const guide = readFileSync(join(REPO_ROOT, 'reference/core/interfaces/using-the-cli.es.md'), 'utf8');
  assert.equal(languageOf(guide).verdict, 'es');
});

test('declines to judge a sample too small to mean anything', () => {
  // A stub or a heading-only page must not be accused of anything.
  assert.equal(languageOf('# Title\n\nA short note.').verdict, 'inconclusive');
});

test('declines to judge a document with no clear majority', () => {
  // Mixed prose — a glossary, a migration note — is not a mislabelled file.
  assert.equal(languageOf(`${SPANISH}\n${ENGLISH}`).verdict, 'inconclusive');
});

test('code, flags and link targets do not count as language', () => {
  // The trap this heuristic would otherwise fall into: a Spanish page full of
  // English identifiers, or an English page whose examples are Spanish.
  const withCode = `
${SPANISH}

\`\`\`bash
the command output path phase rules mode use is are the of to and that with for
\`\`\`

Ver [the documentation](./the-english-file-name.md) y \`the --output flag\`.
`;
  assert.equal(languageOf(withCode).verdict, 'es', 'fenced code must not flip the verdict');
  assert.ok(!proseOf(withCode).includes('--output'), 'inline code must be stripped from the prose');
});
