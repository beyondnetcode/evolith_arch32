import * as fs from 'fs';
import * as path from 'path';

/**
 * ADR-0109 — unified satellite-path resolution for every command
 * (`validate`, `gate`, `phase`, `upgrade`).
 *
 * Resolution order:
 *   1. explicit `--satellite <path>` (canonical) or a deprecated alias
 *      (`--project` on `gate`/`phase`), when provided;
 *   2. the nearest-ancestor `evolith.yaml` walking up from `cwd` — so
 *      `cd mms && evolith upgrade` and `evolith upgrade --satellite mms`
 *      both resolve the same project root (this closes the `upgrade`
 *      `process.cwd()` hardcode);
 *   3. `profile.satellite` from the CLI config;
 *   4. `cwd` as the terminal fallback (a command that then finds no
 *      `evolith.yaml` reports that itself).
 *
 * The returned path is always absolute.
 */
export interface ResolveSatelliteInput {
  /** Explicit `--satellite`/`--project` value, if the user passed one. */
  explicit?: string;
  /** `profile.satellite` from CLI config. */
  profileSatellite?: string;
  /** Working directory to resolve from (default: process.cwd()). */
  cwd?: string;
}

export interface ResolvedSatellite {
  path: string;
  source: 'explicit' | 'ancestor' | 'profile' | 'cwd';
}

/**
 * Walk up from `startDir` returning the first ancestor directory that contains
 * an `evolith.yaml`, or undefined if none is found before the filesystem root.
 */
export function findNearestEvolithYaml(startDir: string): string | undefined {
  let dir = path.resolve(startDir);
  // Bound the walk so we never spin past the filesystem root.
  for (let i = 0; i < 64; i++) {
    if (fs.existsSync(path.join(dir, 'evolith.yaml'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

/** Resolve the satellite project path per the ADR-0109 order. */
export function resolveSatelliteDetailed(input: ResolveSatelliteInput = {}): ResolvedSatellite {
  const cwd = input.cwd ?? process.cwd();

  if (input.explicit) {
    return { path: path.resolve(input.explicit), source: 'explicit' };
  }

  const ancestor = findNearestEvolithYaml(cwd);
  if (ancestor) {
    return { path: ancestor, source: 'ancestor' };
  }

  if (input.profileSatellite) {
    return { path: path.resolve(input.profileSatellite), source: 'profile' };
  }

  return { path: path.resolve(cwd), source: 'cwd' };
}

/** Convenience wrapper returning just the resolved absolute path. */
export function resolveSatellitePath(input: ResolveSatelliteInput = {}): string {
  return resolveSatelliteDetailed(input).path;
}
