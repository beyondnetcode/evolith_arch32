#!/usr/bin/env node

/**
 * GT-397: Bilingual parity check (EN/ES).
 *
 * Thin wrapper that delegates to the bilingual suite. The actual parity
 * logic lives in suites/bilingual-suite.mjs (structural parity + orphan
 * detection). This script exists at the numbered CI path expected by the
 * Intelligent Data Audit and the quality gate.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const suitePath = path.join(__dirname, "suites", "bilingual-suite.mjs");

try {
  execSync(`node "${suitePath}"`, { cwd: process.cwd(), stdio: "inherit" });
} catch (err) {
  process.exit(err.status ?? 1);
}
