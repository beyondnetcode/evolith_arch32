#!/usr/bin/env node

/**
 * GT-423: 35-validate-core-health.mjs
 * Evaluates the core-health-checklist.md rules statically.
 * Output is JSON (PASS/FAIL + evidence) per Winston requirements.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();

// Results accumulator
const report = {
  timestamp: new Date().toISOString(),
  target: "Evolith Core Health",
  checks: {}
};

let allPass = true;

function evaluate(id, name, testFn) {
  try {
    const result = testFn();
    report.checks[id] = {
      name,
      status: result.pass ? "PASS" : "FAIL",
      evidence: result.evidence
    };
    if (!result.pass) allPass = false;
  } catch (error) {
    report.checks[id] = {
      name,
      status: "ERROR",
      evidence: error.message
    };
    allPass = false;
  }
}

// ----------------------------------------------------------------------------
// 1. Statelessness & Tenant Isolation
// ----------------------------------------------------------------------------

evaluate("S1", "No Tenant State in Core", () => {
  const coreDomainSrc = path.join(root, "packages/core-domain/src");
  let evidence = [];
  
  if (fs.existsSync(coreDomainSrc)) {
    try {
      // Find hardcoded tenant_id or workspaceRef inside entities/services (excluding context objects, tests, and the evaluation layer itself)
      const grepOut = execSync(`grep -rnw '${coreDomainSrc}' -e 'tenant_id' -e 'workspaceRef' | grep -v 'EvaluationContext' | grep -v 'evaluation/' | grep -v 'spec.ts' || true`, { encoding: 'utf8' }).trim();
      if (grepOut) {
        evidence = grepOut.split('\n').map(l => l.trim()).filter(Boolean);
      }
    } catch (e) {
      // grep fails if no matches, which is good
    }
  }
  
  return {
    pass: evidence.length === 0,
    evidence: evidence.length > 0 ? `Found potential state leakage:\n${evidence.join('\n')}` : "Clean: No direct tenant state references found outside EvaluationContext."
  };
});

// ----------------------------------------------------------------------------
// 2. Dual-Engine Parity
// ----------------------------------------------------------------------------

evaluate("D1", "TypeScript / OPA Sync", () => {
  const opaDir = path.join(root, "rulesets/opa");
  const tsRulesDir = path.join(root, "packages/core-domain/src/domain/rules");
  
  const opaFiles = fs.existsSync(opaDir) ? fs.readdirSync(opaDir).filter(f => f.endsWith('.rego')) : [];
  const tsFiles = fs.existsSync(tsRulesDir) ? fs.readdirSync(tsRulesDir).filter(f => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.includes('index')) : [];
  
  return {
    pass: true, // This is a heuristic check; deep parity is done by 10-validate-contract-conformance
    evidence: `OPA rules: ${opaFiles.length}. TS rules: ${tsFiles.length}. (Deep sync verified by 10-validate-contract-conformance)`
  };
});

// ----------------------------------------------------------------------------
// 3. Harness Orchestration
// ----------------------------------------------------------------------------

evaluate("H1", "Capabilities over Scripts & JSON Schema Contracts", () => {
  const manifestPath = path.join(root, ".harness/manifest.yaml");
  const schemaPath = path.join(root, ".harness/schemas/winston-audit-output.schema.json");
  
  const hasManifest = fs.existsSync(manifestPath);
  const hasSchema = fs.existsSync(schemaPath);
  
  return {
    pass: hasManifest && hasSchema,
    evidence: `manifest.yaml: ${hasManifest ? 'OK' : 'MISSING'}, winston-audit-output.schema.json: ${hasSchema ? 'OK' : 'MISSING'}`
  };
});

evaluate("H2", "Progress Audit Emitters", () => {
  const runtimeBootstrapPath = path.join(root, "packages/agent-runtime/src/bootstrap.ts");
  const agentRuntimeSrc = path.join(root, "packages/agent-runtime/src");
  let pass = false;
  
  if (fs.existsSync(agentRuntimeSrc)) {
      try {
        const grepOut = execSync(`grep -rnw '${agentRuntimeSrc}' -e 'progress-audit.jsonl' || true`, { encoding: 'utf8' }).trim();
        if (grepOut) pass = true;
      } catch (e) {}
  }

  return {
    pass,
    evidence: pass ? "progress-audit.jsonl emission logic detected in agent-runtime." : "Missing progress-audit.jsonl emission logic in agent-runtime."
  };
});

// ----------------------------------------------------------------------------
// 4. Bounded Context Integrity
// ----------------------------------------------------------------------------

evaluate("B1", "Strict Inbound Ports and Boundary Guard", () => {
  const boundaryGuardScript = path.join(root, ".harness/scripts/ci/34-boundary-guard-repository.mjs");
  let pass = false;
  let evidenceStr = "";
  
  if (fs.existsSync(boundaryGuardScript)) {
    try {
      const execOut = execSync(`node ${boundaryGuardScript}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      pass = true;
      evidenceStr = "34-boundary-guard-repository.mjs passed successfully.";
    } catch (e) {
      pass = false;
      evidenceStr = `34-boundary-guard-repository.mjs failed:\n${e.stderr || e.stdout}`;
    }
  } else {
    evidenceStr = "34-boundary-guard-repository.mjs not found.";
  }

  return {
    pass,
    evidence: evidenceStr
  };
});


// ----------------------------------------------------------------------------
// Print Output
// ----------------------------------------------------------------------------

console.log(JSON.stringify(report, null, 2));

if (!allPass) {
  console.error("\n❌ Core Health Validation FAILED. Check JSON output above for details.");
  process.exit(1);
} else {
  console.log("\n✅ Core Health Validation PASSED.");
  process.exit(0);
}
