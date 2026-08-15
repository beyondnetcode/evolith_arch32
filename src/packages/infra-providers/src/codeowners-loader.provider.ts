import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseCodeowners, type CodeownersRule } from '@beyondnet/evolith-core-domain/domain/codeowners';

const CODEOWNERS_CANDIDATES = ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS'] as const;

/**
 * GT-677 — load and parse a workspace's CODEOWNERS for drift-gate owner enrichment.
 * ONE implementation for the CLI and the MCP tool: MCP previously passed none, so its
 * ledger rows carried no accountable owner while the code comment said they did.
 * An unreadable file is non-fatal — owner degrades to "unassigned", the gate still blocks.
 */
export function loadCodeownersFromWorkspace(workspaceRoot: string): readonly CodeownersRule[] {
  const root = resolve(workspaceRoot);
  for (const rel of CODEOWNERS_CANDIDATES) {
    const full = join(root, rel);
    try {
      if (existsSync(full)) return parseCodeowners(readFileSync(full, 'utf8'));
    } catch {
      // fall through to the next candidate
    }
  }
  return [];
}
