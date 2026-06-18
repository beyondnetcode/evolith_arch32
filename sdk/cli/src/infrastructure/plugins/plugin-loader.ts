import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'yaml';
import { Logger, Provider, Type } from '@nestjs/common';

export class PluginLoader {
  private static readonly logger = new Logger('PluginLoader');

  static async loadPlugins(workspaceDir: string = process.cwd()): Promise<{ providers: Provider[]; imports: Type[] }> {
    const providers: Provider[] = [];
    const imports: Type[] = [];

    // 1. Scan .evolith/plugins/ directory
    const localPluginsDir = path.join(workspaceDir, '.evolith', 'plugins');
    if (await fs.pathExists(localPluginsDir)) {
      try {
        const files = await fs.readdir(localPluginsDir);
        for (const file of files) {
          const pluginPath = path.join(localPluginsDir, file);
          const stat = await fs.stat(pluginPath);
          
          let importPath = '';
          if (stat.isDirectory()) {
            importPath = pluginPath;
          } else if (file.endsWith('.js') || file.endsWith('.ts')) {
            importPath = pluginPath;
          }

          if (importPath) {
            await this.loadPluginFromPath(importPath, providers, imports);
          }
        }
      } catch (err: unknown) {
        this.logger.warn(`Failed to scan local plugins directory: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 2. Scan evolith.yaml plugins section
    const configPath = path.join(workspaceDir, 'evolith.yaml');
    if (await fs.pathExists(configPath)) {
      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = yaml.parse(configContent);
        const plugins = config?.plugins;
        if (Array.isArray(plugins)) {
          for (const plugin of plugins) {
            if (typeof plugin === 'string') {
              let resolvePath = plugin;
              if (plugin.startsWith('.') || plugin.startsWith('/')) {
                resolvePath = path.resolve(workspaceDir, plugin);
              }
              await this.loadPluginFromPath(resolvePath, providers, imports);
            }
          }
        }
      } catch (err: unknown) {
        this.logger.warn(`Failed to read evolith.yaml plugins configuration: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { providers, imports };
  }

  private static async loadPluginFromPath(pluginPath: string, providers: Provider[], imports: Type[]) {
    try {
      const plugin = require(pluginPath);
      
      if (Array.isArray(plugin)) {
        this.registerPluginContent(plugin, providers, imports);
      } else {
        if (plugin.default) {
          this.registerPluginContent(plugin.default, providers, imports);
        }
        
        if (plugin.commands) {
          this.registerPluginContent(plugin.commands, providers, imports);
        }

        if (plugin.module) {
          this.registerPluginContent(plugin.module, providers, imports);
        }
        
        if (typeof plugin === 'function' && plugin.prototype) {
          this.registerPluginContent(plugin, providers, imports);
        }
      }
      
      this.logger.log(`Successfully loaded plugin: ${pluginPath}`);
    } catch (err: unknown) {
      this.logger.warn(`Failed to load plugin from ${pluginPath}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private static registerPluginContent(content: unknown, providers: Provider[], imports: Type[]) {
    if (!content) return;
    
    if (Array.isArray(content)) {
      for (const item of content) {
        this.registerPluginContent(item, providers, imports);
      }
      return;
    }

    if (typeof content === 'function') {
      const isModule = Reflect.getMetadata('imports', content) || Reflect.getMetadata('providers', content);
      if (isModule) {
        if (!imports.includes(content as Type)) {
          imports.push(content as Type);
        }
      } else {
        if (!providers.includes(content as Provider)) {
          providers.push(content as Provider);
        }
      }
    }
  }
}
