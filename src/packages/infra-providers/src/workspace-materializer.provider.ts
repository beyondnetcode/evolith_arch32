import * as path from 'node:path';

import type { IWorkspaceMaterializer } from '@beyondnet/evolith-core-domain';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';

/**
 * Materializes a fetched "TEXT tarball" (in-memory `relPath → content` map, NO installed
 * deps) to a real working directory on disk (GT-512 · EAG-04 · PA-07 infra adapter).
 *
 * This is the concrete half of {@link IWorkspaceMaterializer}: `materializeAndProvision-
 * Environment` (core-domain) fetches sources via `IRepositorySourceReader`, hands them here
 * to become a RESTORABLE checkout, then runs the restore plan (`npm ci` / `dotnet restore`
 * / …) through the sandboxed `NodeProcessRunner` in the returned directory. The Core stays
 * stateless and path-agnostic behind the port; only this adapter touches disk.
 *
 * Safety:
 *  - each checkout lands in a FRESH unique subdirectory under `baseDir` (no collisions,
 *    each evaluation is isolated),
 *  - path traversal is rejected fail-closed — an entry that resolves outside the checkout
 *    root (absolute path, or `..` escaping the root) throws before any write.
 *
 * DEPLOY-GATED (not here): the network fetch that produces the tarball (the
 * `GitHubRepositorySourceReader`, which needs the GitHub API + tar extraction) and the
 * OS-level sandbox the restore runs inside. This adapter only writes the received bytes.
 */
export interface NodeWorkspaceMaterializerOptions {
  /** Root under which each checkout gets its own unique subdirectory. */
  readonly baseDir: string;
  /** Injectable id generator (default: time + random) so tests are deterministic. */
  readonly idFactory?: () => string;
}

export class NodeWorkspaceMaterializer implements IWorkspaceMaterializer {
  private readonly baseDir: string;
  private readonly idFactory: () => string;

  constructor(
    private readonly fs: IFileSystem,
    options: NodeWorkspaceMaterializerOptions,
  ) {
    this.baseDir = options.baseDir;
    this.idFactory = options.idFactory ?? (() => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
  }

  async materialize(files: Readonly<Record<string, string>>): Promise<string> {
    const checkoutPath = path.resolve(this.baseDir, `checkout-${this.idFactory()}`);
    await this.fs.ensureDir(checkoutPath);

    for (const [rel, content] of Object.entries(files)) {
      const target = this.safeResolve(checkoutPath, rel);
      await this.fs.ensureDir(path.dirname(target));
      await this.fs.writeFile(target, content);
    }
    return checkoutPath;
  }

  /** Resolve a relative entry under the root, rejecting anything that escapes it. */
  private safeResolve(root: string, rel: string): string {
    if (path.isAbsolute(rel)) {
      throw new Error(`workspace materializer: refusing absolute path entry '${rel}'`);
    }
    const resolved = path.resolve(root, rel);
    const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
    if (resolved !== root && !resolved.startsWith(rootWithSep)) {
      throw new Error(`workspace materializer: path '${rel}' escapes the checkout root`);
    }
    return resolved;
  }
}
