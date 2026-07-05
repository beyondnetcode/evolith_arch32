import { TopologyCatalogService } from './topology-catalog.service';

const manifest = (id: string, phase: 'F1' | 'F2' | 'F3') => JSON.stringify({
  apiVersion: 'evolith.dev/topology/v1', kind: 'TopologyManifest',
  metadata: { id, name: id, dimension: 'progressive-axis', status: 'accepted', version: '1.0.0' },
  spec: { summary: 'Topology test manifest', topologyType: id, compatibility: { progressiveAxis: { maturityLevel: phase, profile: id }, composableWith: [] }, artifacts: { adrs: [], rulesets: [], opaPolicies: [], aiRulesets: [], umsContracts: [] } },
});

describe('TopologyCatalogService', () => {
  const root = '/core/reference/architecture/topologies';
  const fs: any = {
    exists: jest.fn().mockResolvedValue(true),
    readdir: jest.fn(async (dir: string) => dir === root
      ? [{ name: 'progressive-axis', isFile: () => false, isDirectory: () => true }]
      : [{ name: 'topology.manifest.json', isFile: () => true, isDirectory: () => false }]),
    readFile: jest.fn(async (file: string) => manifest(file.includes('distributed') ? 'distributed-modules' : 'modular-monolith', file.includes('distributed') ? 'F2' : 'F1')),
  };
  const service = new TopologyCatalogService(fs, { error: jest.fn() } as any);

  it('discovers and resolves a progressive-axis manifest', async () => {
    fs.readdir.mockImplementation(async (dir: string) => {
      if (dir === root) return [{ name: 'progressive-axis', isFile: () => false, isDirectory: () => true }];
      if (dir.endsWith('progressive-axis')) return [{ name: 'modular-monolith', isFile: () => false, isDirectory: () => true }];
      return [{ name: 'topology.manifest.json', isFile: () => true, isDirectory: () => false }];
    });
    await expect(service.resolveProgressivePhase('/core', 'F1')).resolves.toMatchObject({ metadata: { id: 'modular-monolith' } });
  });
});
