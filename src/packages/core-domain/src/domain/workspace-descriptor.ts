/**
 * Satellite workspace descriptor (ADR-0109).
 *
 * A workspace (monorepo) declares the roots of N independently-governed
 * satellite projects in a root `evolith.workspace.yaml` (kind:
 * SatelliteWorkspace). This module parses that descriptor and enumerates its
 * projects — the shared primitive `initialize-satellite`/`sync-satellite` use
 * to expand a single repo into per-project records.
 */

/** A single declared project root within a workspace. */
export interface WorkspaceProject {
  /** Project identifier (kebab-case), matching the project manifest's metadata.name. */
  name: string;
  /** Workspace-relative path to the project root (dir holding its evolith.yaml). */
  path: string;
}

/** Parsed `evolith.workspace.yaml`. */
export interface WorkspaceDescriptor {
  apiVersion: string;
  kind: 'SatelliteWorkspace';
  metadata: { name: string; description?: string };
  spec: { projects: WorkspaceProject[] };
}

/**
 * Type-guard: does a parsed document look like a SatelliteWorkspace descriptor?
 * Used to distinguish a workspace root from a single-project satellite so the
 * degenerate (single-repo) case keeps working untouched.
 */
export function isWorkspaceDescriptor(doc: unknown): doc is WorkspaceDescriptor {
  if (!doc || typeof doc !== 'object') return false;
  const d = doc as Record<string, unknown>;
  return d.kind === 'SatelliteWorkspace' && typeof d.spec === 'object' && d.spec !== null
    && Array.isArray((d.spec as Record<string, unknown>).projects);
}

/**
 * Enumerate the declared projects of a workspace descriptor, normalizing each
 * project's path. Returns [] when the document is not a workspace descriptor
 * (single-project satellite) so callers can branch on `length === 0`.
 */
export function enumerateWorkspaceProjects(doc: unknown): WorkspaceProject[] {
  if (!isWorkspaceDescriptor(doc)) return [];
  return doc.spec.projects
    .filter((p): p is WorkspaceProject => Boolean(p) && typeof p.name === 'string' && typeof p.path === 'string')
    .map(p => ({ name: p.name, path: normalizeProjectPath(p.path) }));
}

/** Strip a leading `./` and any trailing slash; empty/root normalizes to '.'. */
export function normalizeProjectPath(rawPath: string): string {
  const trimmed = rawPath.replace(/^\.\//, '').replace(/\/+$/, '');
  return trimmed.length === 0 ? '.' : trimmed;
}
