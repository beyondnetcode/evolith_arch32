import { PluginModule } from './plugin.module';

jest.mock('./plugin-loader', () => ({
  PluginLoader: {
    loadPlugins: jest.fn().mockResolvedValue({
      providers: ['MockProvider'],
      imports: ['MockImport'],
    }),
  },
}));

describe('PluginModule', () => {
  it('should dynamically register plugins as modules, providers, and exports', async () => {
    const dynamicModule = await PluginModule.register('/workspace');
    expect(dynamicModule.module).toBe(PluginModule);
    expect(dynamicModule.providers).toContain('MockProvider');
    expect(dynamicModule.imports).toContain('MockImport');
    expect(dynamicModule.exports).toContain('MockProvider');
  });
});
