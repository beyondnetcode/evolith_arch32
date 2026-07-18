#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

// GT-556: root came from process.cwd(), so from src/ the ADR directory did not exist
// and the signature check quietly had nothing to validate.
import { resolve as resolveKey, relativeToRoot } from '../lib/paths.mjs';
import { assertScanned } from '../lib/coverage.mjs';

const adrDir = resolveKey("adrsCore");

let failures = 0;

// The `if (fs.existsSync(adrDir))` wrapper this replaces is precisely the false-green
// pattern: with a dead adrDir the whole block was skipped and the script printed
// "✅ BMAD Signatures validated." having read nothing. resolveKey already fails closed
// on a missing directory; assertScanned covers the directory-exists-but-empty case.
const adrs = fs.readdirSync(adrDir)
  .filter((file) => file.endsWith(".md"))
  .filter((file) => !file.toLowerCase().includes("readme"));

assertScanned(adrs.length, { what: "ADRs", where: relativeToRoot(adrDir) });

for (const adr of adrs) {
  const content = fs.readFileSync(path.join(adrDir, adr), "utf8");
  if (!content.includes("Agent Signature:") && !content.includes("Firma del Agente:") && !content.includes("Author: Architect Agent") && !content.includes("Author: Docs Agent")) {
    console.error(`❌ [BMAD Signature Validation] Missing agent signature in ADR: ${adr}`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\nValidation failed: ${failures} ADR(s) missing BMAD Agent Signature.`);
  console.error("Rule R-11 requires all architectural documentation to be authored or audited by an AI Agent.");
  console.error("Please add '> **Agent Signature:** Architect Agent' to the document.");
  process.exit(1);
} else {
  console.log("✅ BMAD Signatures validated.");
  process.exit(0);
}
