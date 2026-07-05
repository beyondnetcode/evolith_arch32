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

  corePath(): string {
    return this.config.getOrThrow('CORE_PATH');
  }
}
