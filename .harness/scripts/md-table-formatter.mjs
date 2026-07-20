#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: node .harness/scripts/md-table-formatter.mjs [file.md] [options]

Formats markdown tables consistently:
- Aligns pipes
- Normalizes column widths
- Adds consistent separator dashes
- Trims whitespace

Options:
  --in-place     Modify file in place (default: output to stdout)
  --dry-run      Show what would change without modifying
  --verbose      Show details of changes
  --force        Write even if alignment would blow the file up (see below)

Column alignment pads every cell to the width of the widest cell in its column,
so a table holding long prose explodes. Writing is refused (exit 1) when the
result would grow more than 1.5x; the gap board would grow ~10x, to 2.3 MB of
whitespace. Override with --force only when that is genuinely what you want.

Examples:
  node .harness/scripts/md-table-formatter.mjs docs/adr-0049.md --in-place
  cat table.md | node .harness/scripts/md-table-formatter.mjs --in-place
`);
  process.exit(0);
}

const inPlace = args.includes("--in-place");
const dryRun = args.includes("--dry-run");
const verbose = args.includes("--verbose");
const force = args.includes("--force");

/**
 * Padding blow-up guard.
 *
 * This formatter pads every cell to the width of the widest cell in its column.
 * That is fine for ordinary tables and catastrophic for tables holding long
 * prose: the GT board has Gap cells over 8000 characters, so aligning it turned
 * 232 KB into 2.3 MB (9.8x) of almost pure whitespace -- no data lost, but the
 * file becomes unreadable in source and every later diff unmanageable.
 *
 * The harm is the growth itself, so that is what is measured. Pass --force when
 * the blow-up is genuinely intended.
 */
const GROWTH_LIMIT = 1.5;

function widestCell(content) {
  let widest = 0;
  for (const line of content.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    for (const cell of splitCells(line)) widest = Math.max(widest, cell.length);
  }
  return widest;
}

/**
 * Split a markdown table row into cells, honouring `\|` as an escaped pipe
 * inside a cell rather than a separator.
 *
 * A naive split("|") produced one extra cell on any row using `\|` in prose
 * (the GT board does so constantly: `config\|configRef`, `warn\|block`). Since
 * the rebuild below only emits the first `colCount` cells, the surplus pushed
 * the tail off the end and this formatter silently DELETED the last column --
 * the Status of 31 EN and 33 ES rows -- while writing the file in place.
 */
function splitCells(line) {
  const parts = line.split(/(?<!\\)\|/);
  return parts.map(c => c.trim()).filter((_, i) => i > 0 && i < parts.length - 1);
}

function formatTable(tableLines) {
  if (tableLines.length < 2) return tableLines;

  const rows = [];
  const alignments = [];

  for (const line of tableLines) {
    rows.push(splitCells(line));
  }

  const headerRow = rows[0];
  const colCount = headerRow.length;

  if (rows.length >= 3 && tableLines[1].includes("---")) {
    const sepRow = tableLines[1];
    const alignParts = splitCells(sepRow);
    for (const part of alignParts) {
      const trimmed = part.trim();
      if (trimmed.startsWith(":") && trimmed.endsWith(":")) {
        alignments.push("center");
      } else if (trimmed.endsWith(":")) {
        alignments.push("right");
      } else {
        alignments.push("left");
      }
    }
  } else {
    alignments.push(...Array(colCount).fill("left"));
  }

  while (rows.length > 1 && rows[rows.length - 1].every(c => c === "")) {
    rows.pop();
  }

  const colWidths = Array(colCount).fill(0);
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      colWidths[i] = Math.max(colWidths[i], row[i].length);
    }
  }

  const formattedRows = [];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const cells = [];

    for (let i = 0; i < colCount; i++) {
      const cell = row[i] || "";
      const width = colWidths[i];
      let padded;

      if (r === 1 && tableLines[1].includes("---")) {
        const align = alignments[i] || "left";
        const dashCount = Math.max(width, 3);
        if (align === "center") {
          padded = ":" + "-".repeat(dashCount - 2) + ":";
        } else if (align === "right") {
          padded = "-".repeat(dashCount - 1) + ":";
        } else {
          padded = "-".repeat(dashCount);
        }
      } else {
        const align = alignments[i] || "left";
        if (align === "right") {
          padded = cell.padStart(width);
        } else if (align === "center") {
          padded = cell.padStart(Math.floor((width - cell.length) / 2) + cell.length);
          padded = padded.padEnd(width);
        } else {
          padded = cell.padEnd(width);
        }
      }

      cells.push(padded);
    }

    formattedRows.push("| " + cells.join(" | ") + " |");
  }

  return formattedRows;
}

function formatMarkdown(content) {
  const lines = content.split("\n");
  const result = [];
  let inTable = false;
  let tableLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      if (!inTable) {
        inTable = true;
        tableLines = [];
      }
      tableLines.push(line);
    } else {
      if (inTable && tableLines.length > 0) {
        const formatted = formatTable(tableLines);
        result.push(...formatted);
        result.push("");
        inTable = false;
        tableLines = [];
      }
      result.push(line);
    }
  }

  if (inTable && tableLines.length > 0) {
    const formatted = formatTable(tableLines);
    result.push(...formatted);
  }

  while (result.length > 0 && result[result.length - 1] === "") {
    result.pop();
  }

  return result.join("\n") + "\n";
}

if (args.length === 0 || args.every(a => a.startsWith("--"))) {
  const stdin = fs.readFileSync("/dev/stdin", "utf8");
  console.log(formatMarkdown(stdin));
  process.exit(0);
}

let refused = false;

for (const arg of args) {
  if (arg.startsWith("--") || arg === "node" || arg === "md-table-formatter.mjs") continue;

  const filePath = path.resolve(arg);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    continue;
  }

  const original = fs.readFileSync(filePath, "utf8");
  const formatted = formatMarkdown(original);

  if (formatted === original) {
    console.log(`✓ ${path.relative(root, filePath)} - No changes needed`);
    continue;
  }

  const changes = original.split("\n").filter(l => l.trim()).length !== formatted.split("\n").filter(l => l.trim()).length;
  console.log(`⚠ ${path.relative(root, filePath)} - ${changes > 0 ? "+" : ""}${changes} line changes`);

  if (verbose) {
    const originalLines = original.split("\n");
    const formattedLines = formatted.split("\n");
    for (let i = 0; i < Math.min(originalLines.length, formattedLines.length); i++) {
      if (originalLines[i] !== formattedLines[i]) {
        console.log(`  Line ${i + 1}:`);
        console.log(`    - ${originalLines[i].slice(0, 80)}${originalLines[i].length > 80 ? "..." : ""}`);
        console.log(`    + ${formattedLines[i].slice(0, 80)}${formattedLines[i].length > 80 ? "..." : ""}`);
      }
    }
  }

  const growth = original.length === 0 ? 1 : formatted.length / original.length;
  if (growth > GROWTH_LIMIT && !force) {
    const kb = (n) => `${Math.round(n / 1024)} KB`;
    console.error(`  ✗ REFUSED: aligning this file would grow it ${growth.toFixed(1)}x ` +
                  `(${kb(original.length)} -> ${kb(formatted.length)}), almost all of it whitespace.`);
    console.error(`    Widest cell: ${widestCell(original)} chars. Column alignment pads every row to that width.`);
    console.error(`    This table holds long prose and should not be aligned. Use --force to override.`);
    refused = true;
    continue;
  }

  if (inPlace && !dryRun) {
    fs.writeFileSync(filePath, formatted, "utf8");
    console.log(`  ✓ Formatted in place`);
  } else if (dryRun) {
    console.log(`  [DRY RUN] Would update ${filePath}`);
  }
}

if (refused) {
  process.exit(1);
}