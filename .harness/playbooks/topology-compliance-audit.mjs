#!/usr/bin/env node

/**
 * Topology Compliance Audit — Evolith Core (evolith_arch32)
 *
 * Run:  node .harness/playbooks/topology-compliance-audit.mjs
 *
 * Produces a structured JSON report of compliance per topology.
 * Run with --markdown to get a human-readable Markdown report.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const topologiesDir = path.join(root, "reference/architecture/topologies");
const markdown = process.argv.includes("--markdown");

// ── Helpers ──────────────────────────────────────────────────────────

const exists = (p) => fs.existsSync(path.join(root, p));

/** Walk a directory recursively, returning relative paths from topologiesDir. */
function walk(dir) {
  const files = [];
  const abs = path.join(topologiesDir, dir);
  if (!fs.existsSync(abs)) return files;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...walk(rel));
    else files.push(rel);
  }
  return files.sort();
}

/** Load the Agentic/AI-First topology as the exemplar template. */
function loadExemplar() {
  const exemplarDir = "ai/agentic-ai";
  const files = walk(exemplarDir);
  return {
    name: "agentic-ai",
    path: exemplarDir,
    files,
    docFiles: files.filter((f) => f.endsWith(".md")),
    regoFiles: files.filter((f) => f.endsWith(".rego")),
    rulesFiles: files.filter((f) => f.endsWith(".rules.json")),
    wasmFiles: files.filter((f) => f.endsWith(".wasm")),
    manifestFiles: files.filter((f) => f.endsWith("topology.manifest.json")),
    schemaFiles: files.filter((f) => f.endsWith(".schema.json")),
    fixtureFiles: files.filter((f) => f.includes("fixtures/")),
    parityFixtureFiles: files.filter((f) => f.includes("parity-fixtures/")),
  };
}

const requiredDocSet = [
  "README.md", "adoption.md", "evidence.md", "evolution.md",
  "maturity.md", "operations.md", "patterns.md", "resilience.md",
  "runbooks.md", "security.md",
];

// ── Inventory ────────────────────────────────────────────────────────

const dimensions = fs.readdirSync(topologiesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("."))
  .map((d) => d.name);

const topologies = [];

for (const dim of dimensions) {
  const dimPath = path.join(topologiesDir, dim);
  const subdirs = fs.readdirSync(dimPath, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name);

  if (subdirs.length === 0) continue; // dimension without topology dirs

  for (const sub of subdirs) {
    const rel = `${dim}/${sub}`;
    const files = walk(rel);
    const allAbs = files.map((f) => `reference/architecture/topologies/${rel}/${f}`);

    const docFiles = files.filter((f) => f.endsWith(".md") && !f.includes("/cli/") && !f.includes("/mcp/") && !f.includes("/openapi/"));
    const enDoc = docFiles.filter((f) => !f.endsWith(".es.md"));
    const esDoc = docFiles.filter((f) => f.endsWith(".es.md"));
    const regoFiles = files.filter((f) => f.endsWith(".rego"));
    const rulesFiles = files.filter((f) => f.endsWith(".rules.json"));
    const wasmFiles = files.filter((f) => f.endsWith(".wasm"));
    const manifestFiles = files.filter((f) => f.endsWith("topology.manifest.json"));
    const schemaFiles = files.filter((f) => f.endsWith(".schema.json"));
    const fixtureFiles = files.filter((f) => f.includes("fixtures/"));
    const parityFixtureFiles = files.filter((f) => f.includes("parity-fixtures/"));

    // Check each required doc type exists in EN
    const docResults = {};
    for (const doc of requiredDocSet) {
      const hasEn = files.includes(doc);
      const hasEs = files.includes(doc.replace(".md", ".es.md"));
      docResults[doc] = hasEn && hasEs ? "COMPLETO" : hasEn ? "PARCIAL (solo EN)" : "AUSENTE";
    }

    const regoCount = regoFiles.filter((f) => !f.includes(".test.")).length;
    const regoTestCount = regoFiles.filter((f) => f.includes(".test.")).length;
    const regoStatus = regoCount >= 1 && regoTestCount >= 1
      ? `COMPLETO (${regoCount} policy, ${regoTestCount} test)`
      : regoCount >= 1
        ? `PARCIAL (${regoCount} policy, ${regoTestCount} test)`
        : "AUSENTE";

    const rulesStatus = rulesFiles.length >= 1
      ? `COMPLETO (${rulesFiles.length})`
      : "AUSENTE";

    const wasmStatus = wasmFiles.length >= 1
      ? `COMPLETO (${wasmFiles.length})`
      : "AUSENTE";

    const configSchema = schemaFiles.find((f) => f.includes("topology.config") || f.includes("agent.config"));
    const schemaStatus = configSchema
      ? `COMPLETO (${configSchema})`
      : "AUSENTE";

    const fixturePairs = fixtureFiles.length >= 2
      ? `COMPLETO (${fixtureFiles.length})`
      : fixtureFiles.length >= 1
        ? `PARCIAL (${fixtureFiles.length})`
        : "AUSENTE";

    const parityFixtures = parityFixtureFiles.length >= 2
      ? `COMPLETO (${parityFixtureFiles.length})`
      : "AUSENTE";

    const openapiFiles = files.filter((f) => f.includes("openapi/"));
    const openapiStatus = openapiFiles.length >= 1
      ? `COMPLETO (${openapiFiles.length})`
      : "AUSENTE";

    const mcpManifestFiles = files.filter((f) => f.includes("mcp/"));
    const mcpManifestStatus = mcpManifestFiles.length >= 1
      ? `COMPLETO (${mcpManifestFiles.length})`
      : "AUSENTE";

    const cliFlowFiles = files.filter((f) => f.includes("cli/"));
    const cliFlowStatus = cliFlowFiles.length >= 1
      ? `COMPLETO (${cliFlowFiles.length})`
      : "AUSENTE";

    topologies.push({
      name: sub,
      dimension: dim,
      path: rel,
      fileCount: files.length,
      adrs: "PARCIAL (referenciados en docs, sin ADR inline en topología)",
      opaRego: regoStatus,
      rulesJson: rulesStatus,
      wasm: wasmStatus,
      configSchema: schemaStatus,
      manifest: manifestFiles.length >= 1 ? "COMPLETO" : "AUSENTE",
      fixtures: fixturePairs,
      parityFixtures,
      docEn: `${enDoc.length} de ${requiredDocSet.length}`,
      docEs: `${esDoc.length} de ${requiredDocSet.length}`,
      docStatus: enDoc.length === requiredDocSet.length && esDoc.length === requiredDocSet.length
        ? "COMPLETO"
        : enDoc.length === requiredDocSet.length
          ? "PARCIAL (falta ES)"
          : "AUSENTE",
      // Framework interface gaps
      openapiSpecs: openapiStatus,
      mcpManifests: mcpManifestStatus,
      cliFlows: cliFlowStatus,
      // File paths for evidence
      evidence: {
        allFiles: allAbs,
        docFiles: docFiles.map((f) => `${rel}/${f}`),
        regoFiles: regoFiles.map((f) => `${rel}/${f}`),
        rulesFiles: rulesFiles.map((f) => `${rel}/${f}`),
        manifestFiles: manifestFiles.map((f) => `${rel}/${f}`),
      },
    });
  }
}

// ── Cross-Cutting Ruleset Survey ─────────────────────────────────────

const crossCuttingPaths = [
  "rulesets/compliance-baseline/compliance-baseline.rules.json",
  "rulesets/engineering-manifesto/engineering-manifesto.rules.json",
  "rulesets/definition-of-done/definition-of-done.rules.json",
  "rulesets/repository-taxonomy/repository-taxonomy.rules.json",
  "rulesets/opa/governance.rego",
  "rulesets/opa/compliance-baseline.rego",
  "rulesets/opa/anti-corruption-layer.rego",
  "rulesets/opa/open-core-boundary.rego",
  "rulesets/cli/core-parity.rules.json",
  "rulesets/mcp/protocol-compliance.rules.json",
  "rulesets/sdlc/phase-gates.rules.json",
  "rulesets/acl/anti-corruption-layer.rules.json",
  ".harness/scripts/ci/04-check-bilingual-parity.mjs",
];

const crossCutting = crossCuttingPaths.map((p) => ({
  path: p,
  active: exists(p),
}));

// Check for business data violations in topology docs
function scanBusinessData(topologiesList) {
  const businessPatterns = [
    /\broi\b/i, /\bbudget\b/i, /\bcost\b/i, /\bpresupuesto\b/i, /\bcosto\b/i,
    /\bfinancial\b/i, /\brevenue\b/i, /\bprofit\b/i,
  ];
  const violations = [];
  for (const topo of topologiesList) {
    for (const f of topo.evidence.docFiles) {
      const absPath = path.join(root, "reference/architecture/topologies", f);
      if (!fs.existsSync(absPath)) continue;
      const content = fs.readFileSync(absPath, "utf8");
      for (const pattern of businessPatterns) {
        const match = content.match(pattern);
        if (match) {
          violations.push({
            file: `reference/architecture/topologies/${f}`,
            topology: topo.name,
            pattern: match[0],
            context: content.substring(Math.max(0, match.index - 40), match.index + 40).replace(/\n/g, " "),
          });
          break;
        }
      }
    }
  }
  return violations;
}

const businessViolations = scanBusinessData(topologies);

// ── Exemplar Validation ──────────────────────────────────────────────

const exemplar = loadExemplar();
const scaffoldCmdExists = exists("sdk/cli/src/commands/architecture/scaffold.command.ts");

// ── Scoring ──────────────────────────────────────────────────────────

function scoreArtefactos(topology, exemplarRef) {
  let total = 0;
  let passed = 0;

  // Documentation
  for (const doc of requiredDocSet) {
    total++;
    if (topology.docStatus === "COMPLETO") passed++;
  }

  // OPA rego (policy + test)
  total += 2;
  if (topology.opaRego.startsWith("COMPLETO")) passed += 2;
  else if (topology.opaRego.startsWith("PARCIAL")) passed++;

  // Rules JSON
  total++;
  if (topology.rulesJson.startsWith("COMPLETO")) passed++;

  // WASM
  total++;
  if (topology.wasm.startsWith("COMPLETO")) passed++;

  // Manifest
  total++;
  if (topology.manifest === "COMPLETO") passed++;

  // Config Schema
  total++;
  if (topology.configSchema.startsWith("COMPLETO")) passed++;

  // Fixtures
  total++;
  if (topology.fixtures.startsWith("COMPLETO")) passed++;

  // Parity fixtures
  total++;
  if (topology.parityFixtures.startsWith("COMPLETO")) passed++;

  // OpenAPI (framework interface)
  total++;
  if (topology.openapiSpecs !== "AUSENTE") passed++;

  // MCP manifests (framework interface)
  total++;
  if (topology.mcpManifests !== "AUSENTE") passed++;

  // CLI flows (framework interface)
  total++;
  if (topology.cliFlows !== "AUSENTE") passed++;

  return { total, passed, pct: total > 0 ? Math.round((passed / total) * 100) : 0 };
}

// ── Report ───────────────────────────────────────────────────────────

function generateReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    repository: "evolith_arch32",
    topologiesDir: "reference/architecture/topologies/",
    totalTopologies: topologies.length,
    topologies,
    crossCutting,
    businessViolations,
    exemplar: {
      name: exemplar.name,
      fileCount: exemplar.files.length,
      scaffoldCommandExists: scaffoldCmdExists,
    },
    globalScore: null,
    perTopologyScore: {},
  };

  let grandTotal = 0;
  let grandPassed = 0;

  for (const topo of topologies) {
    const score = scoreArtefactos(topo, exemplar);
    report.perTopologyScore[topo.name] = score;
    grandTotal += score.total;
    grandPassed += score.passed;
  }

  report.globalScore = {
    total: grandTotal,
    passed: grandPassed,
    pct: grandTotal > 0 ? Math.round((grandPassed / grandTotal) * 100) : 0,
  };

  return report;
}

const report = generateReport();

// ── Output ───────────────────────────────────────────────────────────

if (markdown) {
  console.log(`# Topology Compliance Audit Report

**Generated:** ${report.generatedAt}
**Repository:** ${report.repository}
**Topologies evaluated:** ${report.totalTopologies}
**Global Score:** ${report.globalScore.passed}/${report.globalScore.total} (${report.globalScore.pct}%)

---

## 1. Topology Tree

\`\`\`
reference/architecture/topologies/
`);
  const dims = [...new Set(topologies.map((t) => t.dimension))];
  for (const dim of dims) {
    console.log(`├── ${dim}/`);
    const tops = topologies.filter((t) => t.dimension === dim);
    for (const t of tops) {
      console.log(`│   ├── ${t.name}/  (${t.fileCount} files, ${t.openaRego === "AUSENTE" ? "⚠ missing OPA rego" : "✓"})`);
    }
  }
  console.log("```\n");

  // Compliance table
  console.log("## 2. Compliance Table\n");
  console.log("| Topology | Doc EN | Doc ES | OPA Rego | Rules | WASM | Schema | Manifest | Fixtures | Parity Fix | OpenAPI | MCP | CLI | Score |");
  console.log("|----------|--------|--------|----------|-------|------|--------|----------|----------|------------|---------|-----|-----|-------|");
  for (const topo of topologies) {
    const s = report.perTopologyScore[topo.name];
    console.log(`| ${topo.path} | ${topo.docEn} | ${topo.docEs} | ${topo.opaRego} | ${topo.rulesJson} | ${topo.wasm} | ${topo.configSchema} | ${topo.manifest} | ${topo.fixtures} | ${topo.parityFixtures} | ${topo.openapiSpecs} | ${topo.mcpManifests} | ${topo.cliFlows} | ${s.passed}/${s.total} (${s.pct}%) |`);
  }
  console.log(`| **Global** | | | | | | | | | | | | | **${report.globalScore.passed}/${report.globalScore.total} (${report.globalScore.pct}%)** |\n`);

  // Cross-cutting
  console.log("## 3. Cross-Cutting Ruleset Status\n");
  console.log("| Ruleset | Active |");
  console.log("|---------|--------|");
  for (const cc of crossCutting) {
    console.log(`| \`${cc.path}\` | ${cc.active ? "✅" : "❌ AUSENTE"} |`);
  }
  console.log();

  // Business violations
  console.log("## 4. Business Data Violations\n");
  if (businessViolations.length === 0) {
    console.log("✅ No business data violations detected.\n");
  } else {
    for (const v of businessViolations) {
      console.log(`❌ \`${v.file}\`: matched pattern "${v.pattern}"`);
      console.log(`   Context: ${v.context}\n`);
    }
  }

  // Exemplar
  console.log("## 5. Exemplar Validation (Agentic/AI-First)\n");
  console.log(`- File count: ${exemplar.files.length}`);
  console.log(`- \`scaffold\` command exists: \`${scaffoldCmdExists}\``);
  console.log();

  // Gaps
  const allOpenapiOk = topologies.every((t) => t.openapiSpecs !== "AUSENTE");
  const allMcpOk = topologies.every((t) => t.mcpManifests !== "AUSENTE");
  const allCliOk = topologies.every((t) => t.cliFlows !== "AUSENTE");
  console.log("## 6. Framework Interface Gaps (all topologies)\n");
  console.log("| Gap | Status |");
  console.log("|-----|--------|");
  console.log(`| OpenAPI specs per topology | ${allOpenapiOk ? "✅ COMPLETO" : "❌ AUSENTE en todas"} |`);
  console.log(`| MCP tool manifests per topology | ${allMcpOk ? "✅ COMPLETO" : "❌ AUSENTE en todas"} |`);
  console.log(`| CLI flow files per topology | ${allCliOk ? "✅ COMPLETO" : "❌ AUSENTE en todas"} |`);
  console.log();

  // Detailed gaps per topology
  console.log("## 7. Per-Topology Gaps\n");
  for (const topo of topologies) {
    const gaps = [];
    if (!topo.docStatus.startsWith("COMPLETO")) gaps.push("Documentación incompleta");
    if (topo.opaRego === "AUSENTE") gaps.push("OPA Rego ausente");
    if (topo.rulesJson === "AUSENTE") gaps.push("Rules JSON ausente");
    if (topo.wasm === "AUSENTE") gaps.push("WASM ausente");
    if (topo.manifest === "AUSENTE") gaps.push("Manifiesto ausente");
    if (topo.configSchema === "AUSENTE") gaps.push("Schema de configuración ausente");
    if (topo.openapiSpecs === "AUSENTE") gaps.push("OpenAPI specs ausente");
    if (topo.mcpManifests === "AUSENTE") gaps.push("MCP manifests ausente");
    if (topo.cliFlows === "AUSENTE") gaps.push("CLI flows ausente");
    console.log(`### ${topo.path}`);
    if (gaps.length === 0) {
      console.log("✅ Sin brechas");
    } else {
      for (const g of gaps) console.log(`- ❌ ${g}`);
    }
    console.log();
  }
} else {
  // JSON output
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}
