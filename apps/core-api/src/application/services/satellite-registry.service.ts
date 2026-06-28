import { Injectable, NotFoundException } from '@nestjs/common';
import type { SatelliteRecord } from '../../presentation/dtos/satellite.dto';

/**
 * GT-367: In-memory satellite registry service.
 * GT-371: Extended with satellite-to-satellite linking capability.
 *
 * NOTE: The registry is currently in-memory (Map). A persistence layer
 * (e.g. Redis or PostgreSQL) should be introduced in a follow-up ticket
 * once the API contract stabilises.
 */
@Injectable()
export class SatelliteRegistryService {
  private readonly registry = new Map<string, SatelliteRecord>();

  // GT-367 ─────────────────────────────────────────────────────────────────

  register(id: string, name: string, parentCorePath?: string): SatelliteRecord {
    const record: SatelliteRecord = {
      id,
      name,
      status: 'registered',
      parentCorePath,
      registeredAt: new Date().toISOString(),
    };
    this.registry.set(id, record);
    return record;
  }

  findById(id: string): SatelliteRecord | undefined {
    return this.registry.get(id);
  }

  findAll(): SatelliteRecord[] {
    return Array.from(this.registry.values());
  }

  update(id: string, patch: Partial<SatelliteRecord>): SatelliteRecord {
    const existing = this.registry.get(id);
    if (!existing) {
      throw new NotFoundException(`Satellite '${id}' not found in registry`);
    }
    const updated: SatelliteRecord = { ...existing, ...patch };
    this.registry.set(id, updated);
    return updated;
  }

  // GT-371 ─────────────────────────────────────────────────────────────────

  /**
   * Link satellite `id` to the target core satellite `linkedSatelliteId`.
   *
   * Validates that both records exist in the registry, then marks the source
   * satellite as 'linked' and captures the timestamp automatically.
   *
   * @param id               - ID of the satellite to be linked (source).
   * @param linkedSatelliteId - ID of the parent core satellite (target).
   * @returns The updated source {@link SatelliteRecord}.
   * @throws NotFoundException if either satellite is not found in the registry.
   */
  link(id: string, linkedSatelliteId: string): SatelliteRecord {
    const source = this.registry.get(id);
    if (!source) {
      throw new NotFoundException(`Source satellite '${id}' not found in registry`);
    }

    const target = this.registry.get(linkedSatelliteId);
    if (!target) {
      throw new NotFoundException(`Target satellite '${linkedSatelliteId}' not found in registry`);
    }

    const updated: SatelliteRecord = {
      ...source,
      linkedSatelliteId: target.id,
      status: 'linked',
      linkedAt: new Date().toISOString(),
    };

    this.registry.set(id, updated);
    return updated;
  }
}
