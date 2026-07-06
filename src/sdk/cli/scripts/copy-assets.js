#!/usr/bin/env node
/**
 * copy-assets — copy non-TS runtime assets that `tsc` does not emit into `dist/`.
 *
 * The catalog loader reads JSON catalogs from `dist/config/*.json`
 * (`__dirname/../../config`), but `tsc` only compiles `.ts`. Without this step an
 * installed (or built-from-dist) CLI cannot run `init` — it fails with
 * `ENOENT ... dist/config/runtimes.json`. Copy the source `config/*.json`
 * (and any other non-TS assets) into `dist/config/` after compilation.
 *
 * Runs POST-tsc (tsc regenerates dist), and is idempotent.
 */
const fs = require('fs');
const path = require('path');

const cliRoot = path.resolve(__dirname, '..');
const srcConfig = path.join(cliRoot, 'src', 'config');
const destConfig = path.join(cliRoot, 'dist', 'config');

if (!fs.existsSync(destConfig)) fs.mkdirSync(destConfig, { recursive: true });

let copied = 0;
if (fs.existsSync(srcConfig)) {
  for (const entry of fs.readdirSync(srcConfig, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      fs.copyFileSync(path.join(srcConfig, entry.name), path.join(destConfig, entry.name));
      copied++;
    }
  }
}

console.log(`[copy-assets] copied ${copied} config JSON file(s) → dist/config/`);
