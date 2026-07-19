#!/usr/bin/env node
// Rejects product-documentation drift and placeholder pages (GT-47):
//  - no placeholder markers in shipped product READMEs;
//  - the Evolith CLI advertised version matches sdk/cli/package.json;
//  - the generated product inventory is not stale.

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

// GT-556/557: this script carried three independent path defects, each of which turned
// a real check into a no-op or a false failure:
//   1. `reference/products` had moved to `product/products` — every shipped README
//      resolved to nothing, so every domain reported "missing page";
//   2. the CLI package was read from `sdk/cli/package.json` (missing the `src/` prefix),
//      so `pkg.version` was always undefined and the version-drift comparison could
//      never fire — the one assertion this guard exists to make;
//   3. the shipped domain was named `evolith-cli` while the real directory is
//      `smart-cli`, so even a corrected products root would have missed it.
import { REPO_ROOT, resolve as resolveKey, relativeToRoot } from '../lib/paths.mjs';
import { assertScanned } from '../lib/coverage.mjs';

const ROOT = REPO_ROOT;
const PRODUCTS = resolveKey('products');

// Product domains whose READMEs are public, shipped surfaces (must be drift-free).
// `smart-cli` is the real directory name; `evolith-cli` is the product's display name.
const SHIPPED = ['smart-cli', 'mcp-services'];

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
  let pagesChecked = 0;

  // A shipped domain that does not exist on disk is a layout change, not a missing page.
  for (const domain of SHIPPED) {
    if (!fs.existsSync(path.join(PRODUCTS, domain))) {
      errors.push(
        `Shipped product domain '${domain}' does not exist under ${relativeToRoot(PRODUCTS)} — ` +
          'the directory was renamed or moved; update SHIPPED / PATH_KEYS rather than deleting the check.',
      );
    }
  }

  for (const domain of SHIPPED) {
    for (const name of ['README.md', 'README.es.md']) {
      const file = path.join(PRODUCTS, domain, name);
      if (!fs.existsSync(file)) {
        errors.push(`Missing shipped product page: products/${domain}/${name}`);
        continue;
      }
      pagesChecked += 1;
      const content = read(file);
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(content)) {
          errors.push(`products/${domain}/${name} contains placeholder/stale content matching ${pattern}`);
        }
      }
    }
  }

  // A guard that inspected zero pages did not pass — it never ran.
  assertScanned(pagesChecked, { what: 'shipped product README pages', where: relativeToRoot(PRODUCTS) });

  // Advertised Evolith CLI version must match the package manifest.
  const pkg = JSON.parse(read(resolveKey('cliPackageJson')) || '{}');
  if (!pkg.version) {
    errors.push('Could not read a version from src/sdk/cli/package.json — the CLI version-drift check cannot run.');
  }
  for (const name of ['README.md', 'README.es.md']) {
    const content = read(path.join(PRODUCTS, 'smart-cli', name));
    const advertised = content.match(/smart-cli version (\d+\.\d+\.\d+)/);
    if (advertised && advertised[1] !== pkg.version) {
      errors.push(`products/smart-cli/${name} advertises version ${advertised[1]} but the package is ${pkg.version}`);
    }
  }

  // The generated inventory must not be stale.
  try {
    execFileSync('node', [resolveKey('harnessScripts', 'generate-product-inventory.mjs'), '--check'], {
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
