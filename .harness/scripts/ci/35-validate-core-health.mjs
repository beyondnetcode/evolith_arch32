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
  const coreDomainSrcRel = "src/packages/core-domain/src";
  const coreDomainSrc = path.join(root, coreDomainSrcRel);
  let evidence = [];

  if (!fs.existsSync(coreDomainSrc)) {
    throw new Error(
      `core-domain source directory does not exist: ${coreDomainSrcRel}\n` +
      `Refusing to report statelessness over a tree that is not there -- ` +
      `a dead path must never be reported as "Clean".`
    );
  }

  {
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
  const opaDirRel = "src/rulesets/opa";
  // `packages/core-domain/src/domain/rules` never existed at any point in this
  // repo's history (verified with `git log --all -- '*domain/rules*'`) -- it was
  // fabricated, so this heuristic always counted 0 TS rules. The real TypeScript
  // counterpart of the .rego corpus is the native evaluator's handler set, which
  // NativeEvaluator composes and native-opa-parity.spec.ts pairs against OPA.
  const tsRulesDirRel = "src/packages/core-domain/src/application/validators/evaluators/handlers";
  const opaDir = path.join(root, opaDirRel);
  const tsRulesDir = path.join(root, tsRulesDirRel);

  for (const [rel, abs] of [[opaDirRel, opaDir], [tsRulesDirRel, tsRulesDir]]) {
    if (!fs.existsSync(abs)) {
      throw new Error(
        `Rule directory does not exist: ${rel}\n` +
        `Refusing to report engine parity over a corpus that is not there -- ` +
        `a dead path must never be reported as a parity heuristic result.`
      );
    }
  }

  const opaFiles = fs.readdirSync(opaDir).filter(f => f.endsWith('.rego'));
  const tsFiles = fs.readdirSync(tsRulesDir).filter(f => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.includes('index'));

  if (opaFiles.length === 0 || tsFiles.length === 0) {
    throw new Error(
      `Scanned ${opaDirRel} (${opaFiles.length} .rego) and ${tsRulesDirRel} (${tsFiles.length} .ts) ` +
      `and one side is empty.\n` +
      `A zero-rule scan must never be reported as a parity result -- that is a vacuous pass.`
    );
  }

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
  const agentRuntimeSrcRel = "src/packages/agent-runtime/src";
  const runtimeBootstrapPath = path.join(root, agentRuntimeSrcRel, "bootstrap.ts");
  const agentRuntimeSrc = path.join(root, agentRuntimeSrcRel);
  let pass = false;

  if (!fs.existsSync(agentRuntimeSrc)) {
    throw new Error(
      `agent-runtime source directory does not exist: ${agentRuntimeSrcRel}\n` +
      `Refusing to report emitter presence over a tree that is not there.`
    );
  }

  {
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
