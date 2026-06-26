import { InMemoryProviderRegistry, EvidenceProvider } from './provider.ports';

describe('InMemoryProviderRegistry', () => {
  let registry: InMemoryProviderRegistry;
  const mockProvider: EvidenceProvider = {
    id: 'test',
    name: 'Test Provider',
    collectEvidence: jest.fn().mockResolvedValue({ found: true, path: '/test' }),
  };
  beforeEach(() => { registry = new InMemoryProviderRegistry(); });
  it('should register and retrieve evidence provider', () => {
    registry.registerEvidence(mockProvider);
    expect(registry.getEvidence('test')).toBe(mockProvider);
  });
  it('should return undefined for unregistered provider', () => {
    expect(registry.getEvidence('missing')).toBeUndefined();
  });
});
