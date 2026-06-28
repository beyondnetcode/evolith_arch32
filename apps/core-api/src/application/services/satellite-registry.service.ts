import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  RegisterSatelliteDto,
  UpdateSatelliteDto,
  SatelliteStatus,
} from '../../presentation/dtos/satellite.dto';

/**
 * In-memory record type for a registered satellite.
 * GT-369 will introduce a persistent repository; this MVP uses a Map-backed store
 * that can be swapped transparently via the repository pattern.
 */
export interface SatelliteRecord {
  id: string;
  name: string;
  owner: string;
  repoUrl: string;
  cloneUrl: string;
  sshUrl: string;
  topology: string;
  phase: string;
  mode: string;
  status: SatelliteStatus;
  description?: string;
  coreVersion?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class SatelliteRegistryService {
  /** In-memory store — will be replaced by a repository in GT-369 */
  private readonly registry = new Map<string, SatelliteRecord>();

  create(dto: RegisterSatelliteDto): SatelliteRecord {
    const now = new Date().toISOString();
    const record: SatelliteRecord = {
      id: randomUUID(),
      name: dto.name,
      owner: dto.owner,
      repoUrl: dto.repoUrl,
      cloneUrl: dto.cloneUrl,
      sshUrl: dto.sshUrl,
      topology: dto.topology,
      phase: dto.phase,
      mode: dto.mode,
      status: SatelliteStatus.Active,
      description: dto.description,
      coreVersion: dto.coreVersion,
      metadata: dto.metadata,
      createdAt: now,
      updatedAt: now,
    };
    this.registry.set(record.id, record);
    return record;
  }

  findAll(): SatelliteRecord[] {
    return Array.from(this.registry.values());
  }

  findById(id: string): SatelliteRecord {
    const record = this.registry.get(id);
    if (!record) {
      throw new NotFoundException(`Satellite with id '${id}' not found`);
    }
    return record;
  }

  update(id: string, dto: UpdateSatelliteDto): SatelliteRecord {
    const existing = this.findById(id);
    const updated: SatelliteRecord = {
      ...existing,
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.topology !== undefined && { topology: dto.topology }),
      ...(dto.phase !== undefined && { phase: dto.phase }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      updatedAt: new Date().toISOString(),
    };
    this.registry.set(id, updated);
    return updated;
  }

  softDelete(id: string): SatelliteRecord {
    const existing = this.findById(id);
    const archived: SatelliteRecord = {
      ...existing,
      status: SatelliteStatus.Archived,
      updatedAt: new Date().toISOString(),
    };
    this.registry.set(id, archived);
    return archived;
  }
}
