import * as os from 'node:os';
import * as path from 'node:path';
import * as fsExtra from 'fs-extra';
import { NodeFileSystemProvider, YamlConfigParserProvider } from '@beyondnet/evolith-infra-providers';
import { ResourcesService } from './resources.service';

const fs = new NodeFileSystemProvider().createFileSystem();
const configParser = new YamlConfigParserProvider().createConfigParser('yaml');

describe('ResourcesService', () => {
  let service: ResourcesService;
  let cwd: string;
  let root: string;

  beforeEach(async () => {
    service = new ResourcesService(fs, configParser);
    cwd = process.cwd();
    // root/rulesets + root/sub ; chdir into sub so findCorePath() resolves root.
    root = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'evolith-res-'));
    await fsExtra.ensureDir(path.join(root, 'rulesets', 'governance'));
    await fsExtra.writeJson(path.join(root, 'rulesets', 'governance', 'a.rules.json'), { rules: [] });
    await fsExtra.ensureDir(path.join(root, 'sub'));
    process.chdir(path.join(root, 'sub'));
  });

  afterEach(async () => {
    process.chdir(cwd);
    await fsExtra.remove(root);
  });

  it('lists the static resource catalog', async () => {
    const result = await service.list();
    expect(result.resources.length).toBeGreaterThanOrEqual(8);
  });

  it('returns static version and phase-gate resources', async () => {
    expect(await service.read('evolith://governance/version')).toMatchObject({ schema: 'governance' });
    expect(await service.read('evolith://core/version')).toMatchObject({ schema: 'core' });
    expect((await service.read('evolith://phase-gates')) as { phaseGates: unknown[] }).toHaveProperty('phaseGates');
  });

  it('reads rulesets and core info from the discovered core path', async () => {
    const rulesets = (await service.read('evolith://rulesets')) as { count: number };
    expect(rulesets.count).toBe(1);
    const info = (await service.read('evolith://core/info')) as { totalRulesets: number };
    expect(info.totalRulesets).toBe(1);
  });

  it('reads repository config from the current directory', async () => {
    await fsExtra.writeFile(path.join(root, 'sub', 'evolith.yaml'), 'product:\n  name: demo\n');
    expect(await service.read('evolith://repository/config')).toMatchObject({ product: { name: 'demo' } });
  });

  it('reads agents, ruleset content, moscow, open-core and acl resources', async () => {
    const sub = path.join(root, 'sub');
    // agents under cwd
    await fsExtra.ensureDir(path.join(sub, 'rulesets', 'agents', 'guardian'));
    await fsExtra.writeJson(path.join(sub, 'rulesets', 'agents', 'guardian', 'agent.rules.json'), { agent: { name: 'guardian' } });
    // moscow under cwd
    await fsExtra.ensureDir(path.join(sub, '.evolith', 'moscow'));
    await fsExtra.writeJson(path.join(sub, '.evolith', 'moscow', 'phase-0.json'), { items: [1] });
    // open-core + acl + a named ruleset under the discovered core (root)
    await fsExtra.writeJson(path.join(root, 'rulesets', 'governance', 'open-core-boundary.rules.json'), { rules: [] });
    await fsExtra.ensureDir(path.join(root, 'rulesets', 'acl'));
    await fsExtra.writeJson(path.join(root, 'rulesets', 'acl', 'anti-corruption-layer.rules.json'), { rules: [] });

    process.chdir(sub);
    expect((await service.read('evolith://agents')) as { count: number }).toMatchObject({ count: 1 });
    expect(await service.read('evolith://agent/guardian')).toMatchObject({ agent: { name: 'guardian' } });
    expect(await service.read('evolith://moscow/phase-0')).toMatchObject({ items: [1] });
    expect(await service.read('evolith://ruleset/governance-a')).toBeDefined();
    expect(await service.read('evolith://open-core/artifacts')).toBeDefined();
    expect(await service.read('evolith://acl/rules')).toBeDefined();
  });

  // GT-520 · EAG-15 / AC3 — capability manifest + machine contracts resources.
  it('lists and serves the capability manifest and machine contracts resources', async () => {
    // `capabilities` is pure (built from core-domain); `contracts` is read from
    // the discovered core path.
    await fsExtra.ensureDir(path.join(root, 'rulesets', 'contracts'));
    await fsExtra.writeJson(path.join(root, 'rulesets', 'contracts', 'evolith-machine-contracts.json'), {
      contractVersion: '1.0.0',
      compatibilityPolicy: 'semver-major',
      schemas: [{ id: 'gate-evidence', version: '1.0.0' }],
    });

    const uris = (await service.list()).resources.map((r) => r.uri);
    expect(uris).toContain('evolith://capabilities');
    expect(uris).toContain('evolith://contracts');

    const manifest = (await service.read('evolith://capabilities')) as {
      name: string;
      version: string;
      evaluationKinds: string[];
      surfaces: string[];
      sha256: string;
    };
    expect(manifest.name).toBe('evolith-core');
    expect(manifest.evaluationKinds.length).toBeGreaterThan(0);
    expect(manifest.surfaces).toContain('mcp');
    expect(manifest.sha256).toMatch(/^[a-f0-9]{64}$/);

    const contracts = (await service.read('evolith://contracts')) as {
      contractVersion: string;
      schemas: unknown[];
    };
    expect(contracts.contractVersion).toBe('1.0.0');
    expect(Array.isArray(contracts.schemas)).toBe(true);
  });

  it('reports a not-found payload when machine contracts are absent', async () => {
    const contracts = (await service.read('evolith://contracts')) as { error?: string };
    expect(contracts.error).toBe('Machine contracts not found');
  });

  it('throws for an unknown URI', async () => {
    await expect(service.read('evolith://unknown')).rejects.toThrow('Unknown resource URI');
  });

  it('rejects path traversal in ruleset name', async () => {
    await expect(service.read('evolith://ruleset/../../etc/passwd')).rejects.toThrow();
    await expect(service.read('evolith://ruleset/governance/../../etc/passwd')).rejects.toThrow();
  });

  it('rejects path traversal in agent name', async () => {
    await expect(service.read('evolith://agent/../../etc/passwd')).rejects.toThrow();
    await expect(service.read('evolith://agent/guardian/../../etc/passwd')).rejects.toThrow();
  });

  it('rejects path traversal in moscow phase', async () => {
    await expect(service.read('evolith://moscow/../../etc/passwd')).rejects.toThrow();
  });

  it('rejects absolute paths', async () => {
    await expect(service.read('evolith://ruleset//etc/passwd')).rejects.toThrow();
    await expect(service.read('evolith://agent//etc/passwd')).rejects.toThrow();
  });

  it('rejects encoded traversal sequences', async () => {
    await expect(service.read('evolith://ruleset/governance-a%2F..%2F..%2Fetc%2Fpasswd')).rejects.toThrow();
  });
});
