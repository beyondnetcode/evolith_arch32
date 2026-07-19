#!/usr/bin/env node

const SCRIPT_VERSION = "1.0.0";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Self Improving Loop v${SCRIPT_VERSION}

Creates a machine-readable snapshot for the Evolith harness self-improving loop.

Usage:
  node .harness/scripts/skills/self-improving-loop.mjs [flags]

Flags:
  --help, -h              Show this help message
  --task <text>           Task being executed
  --agent <id>            Agent id, for example @winston
  --role <name>           Operational role
  --model <name>          Model identifier when known
  --provider <name>       Provider identifier when known
  --append <path>         Append the record as JSONL
  --dry-run               Print the record without appending
`);
  process.exit(0);
}

const root = process.cwd();

function argValue(flag, fallback) {
  const idx = args.indexOf(flag);
  return idx === -1 ? fallback : args[idx + 1] ?? fallback;
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
}

function parseOpenGaps(markdown) {
  const rows = [];
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("| [`GT-")) continue;
    const columns = line.split("|").map((value) => value.trim()).filter(Boolean);
    if (columns.length < 7) continue;
    const id = columns[0].match(/GT-\d+/)?.[0];
    const status = columns[6].replaceAll("`", "");
    if (!id || status === "DONE" || status === "COMPLETADO") continue;
    rows.push({
      id,
      title: columns[1].replace(/\[`?GT-\d+`?\]\([^)]+\)/g, "").trim(),
      component: columns[2].replaceAll("`", ""),
      priority: columns[4],
      complexity: columns[5],
      status,
    });
  }
  return rows;
}

function parseProgress(markdown) {
  const match = markdown.match(/\*\*Progress:\*\* (\d+) \/ (\d+) done .+? (\d+) pending/);
  if (!match) return null;
  return {
    done: Number(match[1]),
    total: Number(match[2]),
    pending: Number(match[3]),
  };
}

function countManifestCapabilities(manifest) {
  return (manifest.match(/^\s+- name:/gm) || []).length;
}

const filesRead = [
  "AGENTS.md",
  ".harness/rules/global-rules.md",
  ".harness/playbooks/self-improving-loop.md",
  ".harness/manifest.yaml",
  "reference/core/control-center/gaps/gap-tracking.md",
  "reference/core/control-center/gaps/gap-reference-catalog.md",
  "reference/core/control-center/evidence/gap-closure-evidence.json",
].filter(exists);

const gapTracking = read("reference/core/control-center/gaps/gap-tracking.md");
const manifest = read(".harness/manifest.yaml");
const openGaps = parseOpenGaps(gapTracking);
const topGaps = openGaps.slice(0, 5);
const progress = parseProgress(gapTracking);
const manifestCapabilities = countManifestCapabilities(manifest);

const task = argValue("--task", "self-improving-loop-snapshot");
const agent = argValue("--agent", "@winston");
const role = argValue("--role", "Harness Orchestrator");
const appendPath = argValue("--append", "");
const dryRun = args.includes("--dry-run") || !appendPath;

const record = {
  schemaVersion: "1.0.0",
  run_id: crypto.randomUUID(),
  timestamp: new Date().toISOString(),
  agent,
  role,
  model: argValue("--model", "unknown"),
  provider: argValue("--provider", "unknown"),
  task,
  trigger: {
    type: "manual",
    source: "self-improving-loop.mjs",
  },
  loop_stage: "detect",
  context_sources: filesRead,
  files_read: filesRead,
  files_modified: [],
  decisions: [
    `Open gaps detected: ${openGaps.length}`,
    `Manifest capabilities detected: ${manifestCapabilities}`,
    progress ? `Canonical progress: ${progress.done}/${progress.total} done, ${progress.pending} pending` : "Canonical progress line not parsed",
  ],
  risks: topGaps.map((gap) => `${gap.id} ${gap.priority}/${gap.complexity} ${gap.component}: ${gap.title}`),
  validations: [
    {
      command: "node .harness/scripts/ci/01-validate-docs.mjs",
      status: "not_run",
      summary: "Run after documentation or playbook changes.",
    },
    {
      command: "node .harness/scripts/ci/04-check-bilingual-parity.mjs",
      status: "not_run",
      summary: "Run after bilingual documentation changes.",
    },
    {
      command: "node .harness/scripts/ci/08-validate-tracking.mjs",
      status: "not_run",
      summary: "Run after gap tracking, catalog, or closure evidence changes.",
    },
  ],
  status: "completed",
  token_estimate: {
    input: 0,
    output: 0,
    total: 0,
  },
  cost_estimate_usd: 0,
  errors: [],
  retries: 0,
  evidence: [
    ".harness/schemas/progress-audit.schema.json",
    ".harness/playbooks/self-improving-loop.md",
    ".bmad-core/skills/self-improving-loop.md",
  ],
  next_actions: [
    "Append this record as JSONL when the run is part of an approved audit trail.",
    "Register unresolved findings as GT-* entries or closure evidence before claiming completion.",
    "Promote recurring findings into BMAD skills, harness rules, or CI validators.",
  ],
};

if (!dryRun) {
  const target = path.resolve(root, appendPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.appendFileSync(target, `${JSON.stringify(record)}\n`, "utf8");
}

console.log(JSON.stringify(record, null, 2));
