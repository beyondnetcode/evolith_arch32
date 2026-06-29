describe('CLI command smoke tests', () => {
  const commandModules: Array<[string, () => unknown]> = [
    ['AgentsCommand', () => require('../commands/agents')],
    ['UpgradeCommand', () => require('../commands/update/update.command')],
  ];

  it.each(commandModules)('%s module should load without errors', (_name, loader) => {
    expect(() => loader()).not.toThrow();
  });
});
