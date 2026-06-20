#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const adrDir = path.join(root, "reference/architecture/adrs/core");

let failures = 0;

if (fs.existsSync(adrDir)) {
  const adrs = fs.readdirSync(adrDir).filter(file => file.endsWith(".md"));
  for (const adr of adrs) {
    if (adr.toLowerCase().includes("readme")) continue;
    const content = fs.readFileSync(path.join(adrDir, adr), "utf8");
    if (!content.includes("Agent Signature:") && !content.includes("Author: Architect Agent") && !content.includes("Author: Docs Agent")) {
      console.error(`❌ [BMAD Signature Validation] Missing agent signature in ADR: ${adr}`);
      failures++;
    }
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
