/**
 * Port that resolves an opaque workspaceRef into the filesystem locations the
 * pipeline needs (GT-378 / ADR-0074). The Core never receives raw paths from a
 * consumer; the consumer (or the API edge) provides an opaque reference and the
 * concrete resolver (infrastructure / presentation) maps it server-side.
 */

export interface ResolvedWorkspace {
  readonly satellitePath: string;
  readonly corePath?: string;
}

export interface IWorkspaceReferenceResolver {
  resolve(workspaceRef: string): Promise<ResolvedWorkspace>;
}
