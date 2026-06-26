describe('upgrade command E2E', () => {
  it('should be importable', () => {
    expect(() => require('../../commands/upgrade')).not.toThrow();
  });
});
