export interface EvidenceProvider {
  readonly id: string;
  readonly name: string;
  collectEvidence(projectPath: string, artifactName: string): Promise<{ found: boolean; path: string }>;
}

export interface NotificationProvider {
  readonly id: string;
  notify(event: { type: string; payload: unknown }): Promise<void>;
}

export interface StorageProvider {
  readonly id: string;
  save(key: string, value: unknown): Promise<void>;
  load<T>(key: string): Promise<T | null>;
}

export interface ProviderRegistry {
  registerEvidence(provider: EvidenceProvider): void;
  registerNotification(provider: NotificationProvider): void;
  registerStorage(provider: StorageProvider): void;
  getEvidence(id: string): EvidenceProvider | undefined;
  getNotification(id: string): NotificationProvider | undefined;
  getStorage(id: string): StorageProvider | undefined;
}

export class InMemoryProviderRegistry implements ProviderRegistry {
  private evidenceProviders = new Map<string, EvidenceProvider>();
  private notificationProviders = new Map<string, NotificationProvider>();
  private storageProviders = new Map<string, StorageProvider>();

  registerEvidence(p: EvidenceProvider): void { this.evidenceProviders.set(p.id, p); }
  registerNotification(p: NotificationProvider): void { this.notificationProviders.set(p.id, p); }
  registerStorage(p: StorageProvider): void { this.storageProviders.set(p.id, p); }
  getEvidence(id: string): EvidenceProvider | undefined { return this.evidenceProviders.get(id); }
  getNotification(id: string): NotificationProvider | undefined { return this.notificationProviders.get(id); }
  getStorage(id: string): StorageProvider | undefined { return this.storageProviders.get(id); }
}
