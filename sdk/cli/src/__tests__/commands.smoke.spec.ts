describe('CLI command smoke tests', () => {
  const commandModules = [
    ['AgentsCommand', () => require('../commands/agents')],
    ['UpgradeCommand', () => require('../commands/upgrade')],
  ];

  it.each(commandModules)('%s module should load without errors', (_name, loader) => {
    expect(() => loader()).not.toThrow();
  });
});
