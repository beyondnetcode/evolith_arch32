#!/usr/bin/env node

/**
 * GT-377 AC-3: Boundary guard — fails if a *Repository for
 * product/initiative/evidence/decision appears in core-domain.
 *
 * The Core is a stateless evaluator. Business entity repositories
 * belong to the Tracker, not Core. This guard enforces ADR-0101.
 *
 * Exit 0 if clean, 1 if violations found.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const CORE_DOMAIN_SRC_REL = "src/packages/core-domain/src";
const coreDomainSrc = path.join(root, CORE_DOMAIN_SRC_REL);

// Forbidden patterns: Repository interfaces/imports for business entities
const FORBIDDEN_PATTERNS = [
  /IProductRepository/,
  /IInitiativeRepository/,
  /IEvidenceRepository/,
  /IDecisionRepository/,
  /IProduct[A-Z]\w*Repository/,
  /IInitiative[A-Z]\w*Repository/,
  /IEvidence[A-Z]\w*Repository/,
  /IDecision[A-Z]\w*Repository/,
];

const FORBIDDEN_FILENAMES = [
  /product.*repository/i,
  /initiative.*repository/i,
  /evidence.*repository/i,
  /decision.*repository/i,
];

function findTsFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "dist") {
      results = results.concat(findTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".spec.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

const violations = [];

if (!fs.existsSync(coreDomainSrc)) {
  console.error(
    `core-domain source directory does not exist: ${CORE_DOMAIN_SRC_REL}\n` +
    `Refusing to report a boundary verdict over a tree that is not there -- ` +
    `a dead path must never be reported as "no forbidden Repository patterns".`
  );
  process.exit(1);
}

const files = findTsFiles(coreDomainSrc);

if (files.length === 0) {
  console.error(
    `Scanned ${CORE_DOMAIN_SRC_REL} and found zero .ts files.\n` +
    `A zero-file scan must never be reported as "boundary guard passed" -- ` +
    `that is a vacuous pass and it hid this guard's dead path for weeks.`
  );
  process.exit(1);
}

{
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const relPath = path.relative(root, file);

    // Check filename
    for (const pattern of FORBIDDEN_FILENAMES) {
      if (pattern.test(path.basename(file))) {
        violations.push(`${relPath}: filename matches forbidden pattern ${pattern}`);
      }
    }

    // Check content
    for (const pattern of FORBIDDEN_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        violations.push(`${relPath}: contains forbidden pattern ${matches[0]}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error("GT-377 BOUNDARY GUARD FAILED — forbidden Repository patterns found in core-domain:");
  for (const v of violations) {
    console.error(`  ${v}`);
  }
  console.error("\nADR-0101: Core is stateless. Business entity repositories belong to the Tracker.");
  process.exit(1);
}

console.log(`GT-377: Boundary guard passed — no forbidden Repository patterns in core-domain (${files.length} .ts files scanned under ${CORE_DOMAIN_SRC_REL}).`);
process.exit(0);
