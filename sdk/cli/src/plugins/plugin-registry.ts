export interface EvolithPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  register(): void;
  unregister?(): void;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  entrypoint: string;
  commands?: string[];
}

export class PluginRegistry {
  private readonly plugins = new Map<string, EvolithPlugin>();

  register(plugin: EvolithPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already registered: ${plugin.id}`);
    }
    plugin.register();
    this.plugins.set(plugin.id, plugin);
  }

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;
    plugin.unregister?.();
    this.plugins.delete(pluginId);
  }

  get(pluginId: string): EvolithPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  list(): EvolithPlugin[] {
    return [...this.plugins.values()];
  }

  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }
}
