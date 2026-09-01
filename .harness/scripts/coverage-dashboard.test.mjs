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

// ADR-0126 narrowed the GATE to the entry surface, so the unpaired file has to BE on it
// for this test to prove anything. `reference/core/architecture/README.md` is one of the
// seventeen; `reference/architecture/README.md`, which this fixture used before, is not —
// and the test would have passed vacuously against a gate that had stopped looking.
test("exits 1 when an ENTRY-SURFACE EN file lacks its ES counterpart", () => {
  const root = setupFixture({
    "README.md": "# EN",
    "README.es.md": "# ES",
    "core/architecture/README.md": "# Unpaired EN",
  });
  try {
    const out = runIn(root);
    assert.equal(out.status, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("exits 1 when an ENTRY-SURFACE ES file lacks its EN counterpart", () => {
  const root = setupFixture({
    "README.md": "# EN",
    "README.es.md": "# ES",
    "core/architecture/README.es.md": "# Orphan ES",
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

// The other half of ADR-0126, asserted rather than assumed. A document outside the
// entry surface with no twin is deliberately NOT a gate failure any more, and the two
// tests above would happily pass against a gate that had stopped looking at everything.
// This one fails if the narrowing is ever silently widened back.
test("exits 0 when a NON-entry-surface file is unpaired (ADR-0126)", () => {
  const root = setupFixture({
    "README.md": "# EN",
    "README.es.md": "# ES",
    "core/architecture/deep/some-internal-note.md": "# Unpaired, and released by ADR-0126",
  });
  try {
    const out = runIn(root);
    assert.equal(out.status, 0, out.stdout + out.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
