/**
 * InMemoryApprovalStore — default {@link IApprovalStore}. Keeps approval records
 * in a Map. Non-durable on purpose: it is the zero-config default so the package
 * works with no external system. The durable / Tracker-backed store is a sibling
 * adapter (GATED) that implements the same {@link IApprovalStore} interface.
 */

import type { ApprovalRecord, IApprovalStore } from '../../domain/ports/approval.port';

export class InMemoryApprovalStore implements IApprovalStore {
  private readonly records = new Map<string, ApprovalRecord>();

  async get(id: string): Promise<ApprovalRecord | undefined> {
    return this.records.get(id);
  }

  async put(record: ApprovalRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async list(): Promise<readonly ApprovalRecord[]> {
    return [...this.records.values()];
  }
}
