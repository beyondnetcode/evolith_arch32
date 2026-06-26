import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const scriptPath = fileURLToPath(
  new URL("./coverage-dashboard.mjs", import.meta.url),
);

function runIn(cwd) {
  return spawnSync("node", [scriptPath], { cwd, encoding: "utf8" });
}

function setupFixture(files) {
  const root = mkdtempSync(join(tmpdir(), "coverage-dashboard-"));
  const refDir = join(root, "reference");
  mkdirSync(refDir, { recursive: true });
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = join(refDir, filePath);
    mkdirSync(join(fullPath, ".."), { recursive: true });
    writeFileSync(fullPath, content ?? "# test");
  }
  return root;
}

test("exits 0 when all files are paired", () => {
  const root = setupFixture({
    "README.md": "# EN",
    "README.es.md": "# ES",
    "architecture/README.md": "# Arch EN",
    "architecture/README.es.md": "# Arch ES",
  });
  try {
    const out = runIn(root);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /100\.0%/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("exits 0 for root-level paired files (Pattern A)", () => {
  const root = setupFixture({
    "README.md": "# EN",
    "README.es.md": "# ES",
    "index.md": "# Index EN",
    "index.es.md": "# Index ES",
    "navigation.md": "# Nav EN",
    "navigation.es.md": "# Nav ES",
  });
  try {
    const out = runIn(root);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /100\.0%/);
    assert.match(out.stdout, /README\.md.*1.*1.*1.*100%/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("exits 1 when EN file lacks ES counterpart", () => {
  const root = setupFixture({
    "README.md": "# EN",
    "README.es.md": "# ES",
    "architecture/README.md": "# Unpaired EN",
  });
  try {
    const out = runIn(root);
    assert.equal(out.status, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("exits 1 when ES file lacks EN counterpart", () => {
  const root = setupFixture({
    "README.md": "# EN",
    "README.es.md": "# ES",
    "architecture/README.es.md": "# Orphan ES",
  });
  try {
    const out = runIn(root);
    assert.equal(out.status, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("groups Pattern A .es.md files with their EN counterpart", () => {
  const root = setupFixture({
    "README.md": "# EN",
    "README.es.md": "# ES",
    "governance/standards/vision/gap-tracking.md": "# EN Board",
    "governance/standards/vision/gap-tracking.es.md": "# ES Board",
  });
  try {
    const out = runIn(root);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /100\.0%/);
    assert.match(out.stdout, /README\.md.*1.*1.*1.*100%/);
    assert.match(out.stdout, /governance.*\n.*standards.*1.*1.*1.*100%/s);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("groups Pattern B -es/ directory files with their EN counterpart", () => {
  const root = setupFixture({
    "architecture/adrs/0001-foo.md": "# ADR 1 EN",
    "architecture/adrs-es/0001-foo.md": "# ADR 1 ES",
    "architecture/adrs/0002-bar.md": "# ADR 2 EN",
    "architecture/adrs-es/0002-bar.md": "# ADR 2 ES",
  });
  try {
    const out = runIn(root);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /architecture.*2.*2.*2.*100%/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("reports only [OK] status in area breakdown", () => {
  const root = setupFixture({
    "README.md": "# EN",
    "README.es.md": "# ES",
    "architecture/README.md": "# EN",
    "architecture/README.es.md": "# ES",
    "architecture/adrs/0001-foo.md": "# EN",
    "architecture/adrs/0001-foo.es.md": "# ES",
    "governance/README.md": "# EN",
    "governance/README.es.md": "# ES",
  });
  try {
    const out = runIn(root);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /README\.md.*1.*1.*1.*OK/);
    assert.match(out.stdout, /architecture.*2.*2.*2.*OK/);
    assert.match(out.stdout, /governance.*1.*1.*1.*OK/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
