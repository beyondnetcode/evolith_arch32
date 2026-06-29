describe('upgrade command E2E', () => {
  it('should be importable', () => {
    expect(() => require('../../commands/update/update.command')).not.toThrow();
  });
});
