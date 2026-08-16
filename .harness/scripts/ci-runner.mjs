#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const root = process.cwd();
const ciDir = path.join(root, ".harness/scripts/ci");

if (!fs.existsSync(ciDir)) {
  console.error(`CI directory not found: ${ciDir}`);
  process.exit(1);
}

const mode = process.argv[2] || "fast";

// Recursively find all executable mjs scripts except tests
function getAllScripts(dir, baseDir = "") {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllScripts(fullPath, relPath));
    } else if (entry.isFile() && entry.name.endsWith(".mjs") && !entry.name.endsWith(".test.mjs") && !entry.name.startsWith("review-")) {
      results.push(relPath);
    }
  }
  return results.sort();
}

const allScripts = getAllScripts(ciDir);

/**
 * Per-script CLI arguments. Without this every script is spawned bare, so a
 * guard with modes could only ever run in its default one — including in
 * `full`, which picks up every .mjs automatically.
 *
 * GT-578 — `40-validate-path-literals.mjs` was wired here in `--report` mode
 * while the two dead literals it found still existed (the `ci/agentic/` script
 * path in sdk-cli-ci.yml, and that script's pre-refactor
 * `packages/mcp-server/dist/main.js` argv). Both are repaired, so the entry is
 * gone and the guard runs in its DEFAULT STRICT mode: a new dead path literal
 * now fails the governance run instead of being printed and scrolled past.
 * Verified green at the time of the flip: 109 literals across 197 files, 0 dead.
 */
const SCRIPT_ARGS = {};

const MODES = {
  fast: {
    label: "RAPIDO (docs + tracking)",
    scripts: [
      "01-validate-docs.mjs", 
      "03-validate-root-cleanliness.mjs", 
      "suites/bilingual-suite.mjs", 
      "05-validate-executive-summary.mjs", 
      "08-validate-tracking.mjs"
    ],
  },
  governance: {
    label: "GOBERNANZA (docs + tracking + maturity + contracts)",
    scripts: [
      "01-validate-docs.mjs", 
      "03-validate-root-cleanliness.mjs", 
      "suites/bilingual-suite.mjs", 
      "05-validate-executive-summary.mjs", 
      "08-validate-tracking.mjs", 
      "09-reconcile-maturity.mjs", 
      "10-validate-contract-conformance.mjs", 
      "22-validate-topology-composition.mjs", 
      "29-validate-opa-sidecar-bundles.mjs",
      "31-detect-duplicate-rulesets.mjs",
      "32-validate-ruleset-schemas.mjs",
      "33-check-adapter-freshness.mjs",
      "34-boundary-guard-repository.mjs",
      "35-validate-core-health.mjs",
      "36-validate-agent-memory.mjs",
      "38-validate-okf-projection.mjs",
      "40-validate-path-literals.mjs",
      "56-validate-assurance-disclosure.mjs"
    ],
  },
  full: {
    label: "COMPLETO (todos los scripts en paralelo por fases)",
    scripts: allScripts,
  },
  auto: {
    label: "AUTOMATICO (detecta archivos cambiados)",
    scripts: null,
  },
};

function getAutoScripts() {
  const result = spawnSync("git", ["diff", "--cached", "--name-only"], { cwd: root, encoding: "utf8" });
  const changed = (result.stdout || "").split("\n").filter(Boolean);

  const docsChanged = changed.some(f => f.endsWith(".md"));
  const trackingChanged = changed.some(f => f.includes("gap-tracking") || f.includes("gap-reference") || f.includes("gap-closure"));
  const topologyChanged = changed.some(f => f.includes("topologies/"));
  const governanceChanged = changed.some(f => f.includes("src/rulesets/") || f.includes("reference/core/sdlc/"));
  const knowledgeChanged = changed.some(f => f.includes("reference/knowledge/"));
  const codeChanged = changed.some(f => f.endsWith(".ts") || f.endsWith(".js") || f.endsWith(".mjs"));
  const infraChanged = changed.some(f => f.includes("docker-compose") || f.includes("helm/") || f.includes(".github/workflows"));

  const scripts = ["01-validate-docs.mjs", "03-validate-root-cleanliness.mjs"];

  if (docsChanged) {
    scripts.push("suites/bilingual-suite.mjs");
  }
  if (trackingChanged || governanceChanged) {
    scripts.push("08-validate-tracking.mjs");
    scripts.push("09-reconcile-maturity.mjs");
  }
  if (docsChanged || governanceChanged) {
    scripts.push("05-validate-executive-summary.mjs");
  }
  if (topologyChanged) {
    scripts.push("22-validate-topology-composition.mjs");
    scripts.push("26-validate-topology-rule-coverage.mjs");
  }
  if (codeChanged) {
    scripts.push("10-validate-contract-conformance.mjs");
    scripts.push("11-validate-product-docs.mjs");
    scripts.push("19-validate-rest-versioning.mjs");
    scripts.push("20-validate-surface-compatibility.mjs");
    // Also include agentic code review if code changed
    scripts.push("agentic/13-agentic-code-review.mjs");
  }
  if (infraChanged) {
    scripts.push("07-generate-inventories.mjs");
    scripts.push("29-validate-opa-sidecar-bundles.mjs");
  }
  if (codeChanged || infraChanged) {
    // GT-578: workflows, harness scripts and compose files are exactly where a
    // path *string* survives a move that the compiler would have caught.
    scripts.push("40-validate-path-literals.mjs");
  }
  if (knowledgeChanged) {
    scripts.push("38-validate-okf-projection.mjs");
  }

  return [...new Set(scripts)];
}

async function resolveAutoScripts() {
  if (mode === "auto") {
    return getAutoScripts();
  }
  return MODES[mode]?.scripts || [];
}

async function main() {
  let scriptsToRun = await resolveAutoScripts();

  if (mode === "--help" || mode === "-h" || (!MODES[mode] && mode !== "auto")) {
    console.log("Usage: ci-runner.mjs [mode]");
    console.log("");
    console.log("Modes:");
    console.log("  fast        Docs + tracking validation (~2s)");
    console.log("  governance  Docs + tracking + maturity + contracts (~3s)");
    console.log("  full        All CI scripts in parallel phases (~2-3s)");
    console.log("  auto        Detect changed files, run relevant scripts");
    console.log("  --help      Show this help");
    process.exit(mode === "--help" || mode === "-h" ? 0 : 1);
  }

  if (scriptsToRun.length === 0) {
    console.log("No relevant scripts to run for the changed files.");
    process.exit(0);
  }

  const modeLabel = mode === "auto" ? `AUTOMATICO (${scriptsToRun.length} scripts)` : MODES[mode].label;
  console.log(`🚀 Evolith CI — ${modeLabel} (Ejecución Paralela)`);
  console.log(`══════════════════════════════════════════════════════════════════════`);

  // Group scripts by stages based on known heavy tasks
  const stage1 = []; // fast checks
  const stage2 = []; // normal governance checks
  const stage3 = []; // heavy / agentic tasks

  for (const script of scriptsToRun) {
    if (script.startsWith("agentic/") || script.includes("rag-") || script.includes("synchronizer")) {
      stage3.push(script);
    } else if (script.includes("topology-") || script.includes("contract-") || script.includes("opa-") || script.includes("maturity")) {
      stage2.push(script);
    } else {
      stage1.push(script);
    }
  }

  const stages = [stage1, stage2, stage3].filter(s => s.length > 0);
  let totalFailures = 0;
  let executedCount = 0;

  for (let i = 0; i < stages.length; i++) {
    const stageScripts = stages[i];
    console.log(`\n⏳ Iniciando Fase ${i + 1} (${stageScripts.length} scripts en paralelo)...`);
    
    const promises = stageScripts.map(script => {
      const scriptPath = path.join(ciDir, script);
      // GT-578: a script named in a MODES list that is not on disk used to be
      // skipped with status 0 and then filtered out of the count entirely — a
      // dead path literal in this very file produced a green pipeline that had
      // silently stopped running a guard. `full` is enumerated from disk, so a
      // miss here can only mean a hand-written entry has gone stale.
      if (!fs.existsSync(scriptPath)) {
        return Promise.resolve({
          script,
          status: 1,
          stdout: "",
          stderr:
            `Script not found: ${path.relative(root, scriptPath)}\n` +
            `A named CI script that does not exist must never be reported as skipped-and-green.`,
        });
      }

      const scriptArgs = SCRIPT_ARGS[path.basename(script)] ?? [];

      return new Promise((resolve) => {
        const proc = spawn(process.execPath, [scriptPath, ...scriptArgs], { cwd: root });
        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", data => stdout += data.toString());
        proc.stderr.on("data", data => stderr += data.toString());

        proc.on("close", status => resolve({ script, status, stdout, stderr, scriptArgs }));
      });
    });

    const results = await Promise.all(promises);

    for (const res of results) {
      executedCount++;

      // Surface the mode a script ran in. A guard spawned with `--report` is
      // not the same verdict as a guard spawned strict, and a bare ✅ next to
      // its name would say it was.
      const suffix = res.scriptArgs?.length ? ` \x1b[33m[${res.scriptArgs.join(" ")}]\x1b[0m` : "";

      if (res.status === 0) {
        console.log(`\x1b[32m✅ [OK]\x1b[0m ${res.script}${suffix}`);
      } else {
        console.error(`\x1b[31m❌ [FAIL]\x1b[0m ${res.script} (Exit Code: ${res.status})`);
        totalFailures++;
      }
      
      // Print output nicely indented
      const combinedOutput = (res.stdout + "\n" + res.stderr).trim();
      if (combinedOutput) {
        console.log(combinedOutput.split("\n").map(line => `   │ ${line}`).join("\n"));
        console.log("   └────────────────────────────────────────────────────────");
      }
    }

    if (totalFailures > 0) {
      // Fail fast to prevent proceeding to next stages if current stage fails
      break; 
    }
  }

  console.log(`\n══════════════════════════════════════════════════════════════════════`);
  if (totalFailures > 0) {
    console.error("❌ CI Pipeline Failed.");
    process.exit(1);
  } else {
    console.log(`✅ CI Pipeline Passed! (${executedCount} scripts executed)`);
    process.exit(0);
  }
}

// `main().catch(console.error)` imprimia el error y salia con codigo 0: un
// runner de CI que no podia fallar por crash. Un fallo de script si salia 1
// correctamente, pero una excepcion no capturada en main() (ENOENT, JSON
// invalido, un guard que revienta) se reportaba como pipeline verde.
main().catch((error) => {
  console.error('\n❌ CI runner crashed:', error?.stack || error);
  process.exit(1);
});
