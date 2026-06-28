import fs from 'fs/promises';
import path from 'path';

export const readGapTrackingDef = {
  name: "evolith-read-gap-tracking",
  description: "Reads the Evolith architectural gap tracking board and reports the open (non-terminal) gaps and overall progress.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

/** Statuses that count as closed/parked — everything else is "open" work. */
const TERMINAL_STATUSES = new Set(["DONE", "DELIVERED", "CANCELLED"]);

const BOARD_RELATIVE_PATH = path.join(
  'reference', 'governance', 'standards', 'vision', 'gap-tracking.md',
);

/**
 * Resolve the repo root from an explicit arg, then EVOLITH_REPO_ROOT, then cwd
 * (GAP MT-PATH: do not assume the host process was launched from the repo root).
 */
function resolveRoot(rootDir) {
  return rootDir || process.env.EVOLITH_REPO_ROOT || process.cwd();
}

/** Extract the Status token (last backtick-wrapped UPPERCASE word) from a row. */
function parseStatus(row) {
  const tokens = [...row.matchAll(/`([A-Z][A-Z-]+)`/g)].map((m) => m[1]);
  return tokens.length ? tokens[tokens.length - 1] : null;
}

/** Parse the board markdown into gap rows with a resolved status. */
export function parseGapBoard(content) {
  const rows = content
    .split('\n')
    .filter((line) => line.startsWith('|') && /`(GT-\d+|MT-A\d+)`/.test(line));
  const gaps = rows.map((row) => ({ row, status: parseStatus(row) }));
  const open = gaps.filter((g) => g.status && !TERMINAL_STATUSES.has(g.status));
  return { total: gaps.length, open };
}

export async function readGapTrackingHandler(args = {}) {
  try {
    const filePath = path.join(resolveRoot(args.rootDir), BOARD_RELATIVE_PATH);
    const content = await fs.readFile(filePath, 'utf-8');
    const { total, open } = parseGapBoard(content);

    const body = open.length
      ? open.map((g) => g.row).join('\n')
      : '(no open gaps — board is fully closed)';

    return {
      content: [
        {
          type: "text",
          text: `Evolith Gap Tracking Board:\n${open.length} open of ${total} tracked gaps.\n\n${body}`,
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to read gap tracking: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
}
