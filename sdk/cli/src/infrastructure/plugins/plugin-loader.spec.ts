import { PluginLoader } from './plugin-loader';
import * as fsExtra from 'fs-extra';
import * as yaml from 'yaml';
import { Command, CommandRunner } from 'nest-commander';
import { Module } from '@nestjs/common';

jest.mock('fs-extra');
jest.mock('yaml');

jest.mock(
  '/workspace/.evolith/plugins/test-plugin.js',
  () => ({
    default: [TestCommand],
  }),
  { virtual: true }
);

jest.mock(
  'my-npm-plugin',
  () => ({
    module: TestModule,
  }),
  { virtual: true }
);

@Command({ name: 'test-plugin-cmd', description: 'Plugin command' })
class TestCommand extends CommandRunner {
  async run(): Promise<void> {}
}

@Module({
  providers: [TestCommand],
})
class TestModule {}

describe('PluginLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty lists when no plugins directory or config exist', async () => {
    (fsExtra.pathExists as unknown as jest.Mock).mockResolvedValue(false);

    const result = await PluginLoader.loadPlugins('/workspace');
    expect(result.providers).toEqual([]);
    expect(result.imports).toEqual([]);
  });

  it('should load local command plugins from .evolith/plugins', async () => {
    (fsExtra.pathExists as unknown as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('.evolith/plugins')) return Promise.resolve(true);
      return Promise.resolve(false);
    });

    (fsExtra.readdir as unknown as jest.Mock).mockResolvedValue(['test-plugin.js']);
    (fsExtra.stat as unknown as jest.Mock).mockResolvedValue({
      isDirectory: () => false,
    });

    const result = await PluginLoader.loadPlugins('/workspace');
    expect(result.providers).toContain(TestCommand);
  });

  it('should load module plugins from evolith.yaml config list', async () => {
    (fsExtra.pathExists as unknown as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('evolith.yaml')) return Promise.resolve(true);
      return Promise.resolve(false);
    });

    (fsExtra.readFile as unknown as jest.Mock).mockResolvedValue('plugins:\n  - my-npm-plugin');
    (yaml.parse as unknown as jest.Mock).mockReturnValue({
      plugins: ['my-npm-plugin'],
    });

    const result = await PluginLoader.loadPlugins('/workspace');
    expect(result.imports).toContain(TestModule);
  });
});
