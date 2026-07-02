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
const coreDomainSrc = path.join(root, "packages/core-domain/src");

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

if (fs.existsSync(coreDomainSrc)) {
  const files = findTsFiles(coreDomainSrc);
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

console.log("GT-377: Boundary guard passed — no forbidden Repository patterns in core-domain.");
process.exit(0);
