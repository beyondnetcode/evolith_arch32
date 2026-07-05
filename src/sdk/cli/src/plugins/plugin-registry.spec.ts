import { PluginRegistry, EvolithPlugin } from './plugin-registry';

const makePlugin = (id: string): EvolithPlugin => ({
  id,
  name: `Plugin ${id}`,
  version: '1.0.0',
  register: jest.fn(),
  unregister: jest.fn(),
});

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => { registry = new PluginRegistry(); });

  it('should register a plugin and call register()', () => {
    const plugin = makePlugin('test');
    registry.register(plugin);
    expect(plugin.register).toHaveBeenCalledTimes(1);
    expect(registry.has('test')).toBe(true);
  });

  it('should throw when registering duplicate plugin id', () => {
    registry.register(makePlugin('dup'));
    expect(() => registry.register(makePlugin('dup'))).toThrow('Plugin already registered: dup');
  });

  it('should unregister a plugin and call unregister()', () => {
    const plugin = makePlugin('rm');
    registry.register(plugin);
    registry.unregister('rm');
    expect(plugin.unregister).toHaveBeenCalledTimes(1);
    expect(registry.has('rm')).toBe(false);
  });

  it('should list all registered plugins', () => {
    registry.register(makePlugin('a'));
    registry.register(makePlugin('b'));
    expect(registry.list()).toHaveLength(2);
  });

  it('should return undefined for unknown plugin', () => {
    expect(registry.get('missing')).toBeUndefined();
  });
});
