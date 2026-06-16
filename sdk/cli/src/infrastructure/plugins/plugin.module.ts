import { Module, DynamicModule } from '@nestjs/common';
import { PluginLoader } from './plugin-loader';

@Module({})
export class PluginModule {
  static async register(workspaceDir?: string): Promise<DynamicModule> {
    const { providers, imports } = await PluginLoader.loadPlugins(workspaceDir);
    return {
      module: PluginModule,
      imports,
      providers,
      exports: providers,
    };
  }
}
