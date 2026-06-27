/**
 * Blueprint repository port (GT-325).
 *
 * Hexagonal architecture outbound port — infrastructure adapters implement this
 * interface; domain/application code depends only on the abstraction.
 */

import type { Blueprint } from '../../domain/entities/blueprint';

export interface IBlueprintRepository {
  /** Persist a new or updated blueprint. */
  save(blueprint: Blueprint): Promise<void>;

  /** Retrieve a blueprint by its unique id, or null when not found. */
  findById(id: string): Promise<Blueprint | null>;

  /** Retrieve all blueprints belonging to a tenant. */
  findByTenant(tenantId: string): Promise<Blueprint[]>;
}
