#!/usr/bin/env node
// Rejects product-documentation drift and placeholder pages (GT-47):
//  - no placeholder markers in shipped product READMEs;
//  - the Evolith CLI advertised version matches sdk/cli/package.json;
//  - the generated product inventory is not stale.

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PRODUCTS = path.join(ROOT, 'reference/products');

// Product domains whose READMEs are public, shipped surfaces (must be drift-free).
const SHIPPED = ['evolith-cli', 'mcp-services'];

const PLACEHOLDER_PATTERNS = [
  /content pending/i,
  /pending migration\/elaboration/i,
  /contenido pendiente/i,
  /\bTBD\b/,
  /coming soon/i,
  /\b0\.0\.\d+-beta\b/,
];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
}

function run() {
  const errors = [];

  for (const domain of SHIPPED) {
    for (const name of ['README.md', 'README.es.md']) {
      const file = path.join(PRODUCTS, domain, name);
      if (!fs.existsSync(file)) {
        errors.push(`Missing shipped product page: products/${domain}/${name}`);
        continue;
      }
      const content = read(file);
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(content)) {
          errors.push(`products/${domain}/${name} contains placeholder/stale content matching ${pattern}`);
        }
      }
    }
  }

  // Advertised Evolith CLI version must match the package manifest.
  const pkg = JSON.parse(read(path.join(ROOT, 'sdk/cli/package.json')) || '{}');
  for (const name of ['README.md', 'README.es.md']) {
    const content = read(path.join(PRODUCTS, 'evolith-cli', name));
    const advertised = content.match(/smart-cli version (\d+\.\d+\.\d+)/);
    if (advertised && advertised[1] !== pkg.version) {
      errors.push(`products/smart-cli/${name} advertises version ${advertised[1]} but the package is ${pkg.version}`);
    }
  }

  // The generated inventory must not be stale.
  try {
    execFileSync('node', [path.join(ROOT, '.harness/scripts/generate-product-inventory.mjs'), '--check'], {
      cwd: ROOT,
      stdio: 'pipe',
    });
  } catch (e) {
    errors.push(`Product inventory is stale: ${String(e.stdout || e.message).trim()}`);
  }

  if (errors.length) {
    for (const error of errors) console.error(`❌ [ERROR] ${error}`);
    console.error('\n❌ Product documentation validation failed.');
    process.exit(1);
  }

  console.log(`✅ Product documentation is synchronized (Evolith CLI ${pkg.version}, no placeholders).`);
}

run();
