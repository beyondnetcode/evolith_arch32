import * as path from 'path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../infrastructure/config/env.validation';

/**
 * Resolves an opaque workspace reference issued by the Tracker BFF.
 *
 * Core never receives a user path, UMS token, repository credential, or tenant
 * identifier. The BFF owns authorization and creates a short-lived workspace
 * beneath WORKSPACE_ROOT before invoking Core.
 */
@Injectable()
export class WorkspaceReferenceResolverService {
  constructor(private readonly config: ConfigService<EnvConfig>) {}

  resolve(workspaceRef: string): string {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(workspaceRef)) {
      throw new BadRequestException('workspaceRef must be an opaque identifier');
    }

    const root = path.resolve(this.config.getOrThrow('WORKSPACE_ROOT'));
    const resolved = path.resolve(root, workspaceRef);
    if (!resolved.startsWith(`${root}${path.sep}`)) {
      throw new BadRequestException('workspaceRef resolves outside the workspace root');
    }
    return resolved;
  }

  /**
   * Legacy `satellitePath` (pre-ADR-0101 callers still send a filesystem path).
   * Accepted only when it resolves INSIDE `WORKSPACE_ROOT` — relative to it or
   * absolute beneath it — so a caller cannot point the Core at `/etc` or at the
   * Core's own checkout. Anything else is a 400 that names `workspaceRef` as the
   * replacement.
   */
  resolveLegacyPath(rawPath: string, field = 'satellitePath'): string {
    if (typeof rawPath !== 'string' || rawPath.length === 0 || rawPath.length > 1024 || rawPath.includes('\0')) {
      throw new BadRequestException(`${field} must be a non-empty path`);
    }
    const root = path.resolve(this.config.getOrThrow('WORKSPACE_ROOT'));
    const resolved = path.resolve(root, rawPath);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
      throw new BadRequestException(
        `${field} resolves outside the workspace root; send an opaque workspaceRef instead`,
      );
    }
    return resolved;
  }

  /**
   * A caller-supplied `corePath` override. The Core rules live at the configured
   * `CORE_PATH`; the only other place a request may point at is a Core checkout
   * inside its own workspace. Absent → the configured path.
   */
  resolveCorePathOverride(rawPath: string | undefined): string {
    const configured = path.resolve(this.corePath());
    if (rawPath === undefined || rawPath === null || rawPath === '') return configured;
    if (typeof rawPath !== 'string' || rawPath.includes('\0')) {
      throw new BadRequestException('corePath must be a path');
    }
    if (path.resolve(rawPath) === configured) return configured;
    return this.resolveLegacyPath(rawPath, 'corePath');
  }

  corePath(): string {
    return this.config.getOrThrow('CORE_PATH');
  }
}
