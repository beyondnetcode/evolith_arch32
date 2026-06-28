import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { parseGapBoard, readGapTrackingHandler } from "../tools/read-gap-tracking.js";

const FIXTURE_BOARD = `# Gap Tracking

| ID | Gap | Component | Phase | Criticality | Complexity | Status |
| --- | --- | --- | --- | --- | --- | --- |
| [\`GT-001\`](./gap-reference-catalog.md#gt-001) | Done thing | \`core\` | design | \`P1\` | \`M\` | \`DONE\` |
| [\`GT-002\`](./gap-reference-catalog.md#gt-002) | Open thing | \`mcp-server\` | construction | \`P0\` | \`L\` | \`OPEN\` |
| [\`GT-003\`](./gap-reference-catalog.md#gt-003) | In progress thing | \`cli\` | validation | \`P1\` | \`M\` | \`IN-PROGRESS\` |
| [\`MT-A04\`](./plan.md#tracking) | Deferred thing | \`docs\` | delivery | \`P2\` | \`S\` | \`DEFERRED\` |
`;

test("parseGapBoard counts totals and surfaces only non-terminal gaps", () => {
  const { total, open } = parseGapBoard(FIXTURE_BOARD);
  assert.equal(total, 4);
  // OPEN, IN-PROGRESS and DEFERRED are open; DONE is terminal.
  assert.equal(open.length, 3);
  assert.ok(open.every((g) => g.status !== "DONE"));
});

test("handler reports open gaps against an injected root (not cwd)", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "evolith-gap-"));
  const dir = path.join(root, "reference", "governance", "standards", "vision");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "gap-tracking.md"), FIXTURE_BOARD, "utf-8");

  const result = await readGapTrackingHandler({ rootDir: root });
  assert.equal(result.isError, undefined);
  assert.match(result.content[0].text, /3 open of 4 tracked gaps/);
  assert.match(result.content[0].text, /GT-002/);
  assert.doesNotMatch(result.content[0].text, /GT-001/);
});

test("handler returns a structured error when the board is missing", async () => {
  const result = await readGapTrackingHandler({ rootDir: path.join(tmpdir(), "evolith-nope-xyz") });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /Failed to read gap tracking/);
});
