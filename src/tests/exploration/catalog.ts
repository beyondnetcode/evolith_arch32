import * as fs from 'node:fs';
import * as path from 'node:path';
import { SurfaceOp, Surface } from './types';

// The catalog is the SURFACE-PARITY MATRIX — the pre-existing, CI-validated,
// machine-readable inventory of every operation across CLI/MCP/REST (GT-171).
// The tester consumes it as its discovery layer rather than hardcoding operations.
// __dirname = <repo>/src/tests/exploration → three levels up is the repo root.
export const REPO_ROOT = path.resolve(__dirname, '../../..');
const MATRIX_PATH = path.join(
  REPO_ROOT,
  'reference/core/control-center/audits/surface-parity-matrix.json',
);

export function loadCatalog(): SurfaceOp[] {
  const raw = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8')) as {
    operations: SurfaceOp[];
  };
  return raw.operations;
}

export function exposedOn(op: SurfaceOp, surface: Surface): boolean {
  return Boolean(op[surface] && op[surface].exposed);
}

/** Operations exposed on all three surfaces — the cross-interface "triangle". */
export function triangleOps(ops: SurfaceOp[]): SurfaceOp[] {
  return ops.filter(
    (o) => exposedOn(o, 'cli') && exposedOn(o, 'mcp') && exposedOn(o, 'rest'),
  );
}

export function countExposed(ops: SurfaceOp[]): Record<Surface, number> {
  return {
    cli: ops.filter((o) => exposedOn(o, 'cli')).length,
    mcp: ops.filter((o) => exposedOn(o, 'mcp')).length,
    rest: ops.filter((o) => exposedOn(o, 'rest')).length,
  };
}
