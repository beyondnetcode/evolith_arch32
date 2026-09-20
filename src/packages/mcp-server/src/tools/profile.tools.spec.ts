import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ProfileStoreReader } from '@beyondnet/evolith-core-domain/application/services';
import { createProfileTools } from './profile.tools';

/**
 * GT-682 (#760). The tool answers through core-domain's `ProfileStoreReader`,
 * the same functions the CLI `ConfigService` now delegates to, so the fixture
 * is the STORE FILE (`config.yaml`, JSON body — what `conf` writes), never a
 * stubbed reader.
 */
describe('createProfileTools (GT-682 #760)', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-profile-tool-'));
    file = path.join(dir, 'config.yaml');
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const writeStore = (store: unknown) => fs.writeFileSync(file, JSON.stringify(store, undefined, '\t'));
  const reader = (env: NodeJS.ProcessEnv = {}) => new ProfileStoreReader({ path: file, env });

  it('registers exactly one read-only tool named evolith-profile', () => {
    const tools = createProfileTools(reader());
    expect(tools).toHaveLength(1);
    expect(tools[0].schema.name).toBe('evolith-profile');
    expect(tools[0].mutative).toBeFalsy();
    expect(tools[0].scope).toBe('read');
    expect(tools[0].schema.inputSchema.properties.action).toMatchObject({ enum: ['current', 'list'] });
  });

  describe('current (default action)', () => {
    it('returns the active profile with its values in a success envelope with a correlationId', async () => {
      writeStore({
        activeProfile: 'staging',
        profiles: { default: {}, staging: { core: '../evolith', tenant: 'acme', select: ['core/security'] } },
      });
      const [tool] = createProfileTools(reader());
      const result: any = await tool.execute({});

      expect(result).toMatchObject({ success: true, meta: { command: 'evolith-profile', schemaVersion: '1.0.0' } });
      expect(typeof result.meta.correlationId).toBe('string');
      expect(result.meta.correlationId.length).toBeGreaterThan(0);
      // Same payload as `evolith profile current --format json`: name + the profile's fields.
      expect(result.data).toEqual({ name: 'staging', core: '../evolith', tenant: 'acme', select: ['core/security'] });
    });

    it('EVOLITH_PROFILE overrides the stored selection, exactly as on the CLI', async () => {
      writeStore({ activeProfile: 'staging', profiles: { default: {}, staging: { tenant: 'acme' }, ci: { core: '/core' } } });
      const [tool] = createProfileTools(reader({ EVOLITH_PROFILE: 'ci' }));
      const result: any = await tool.execute({ action: 'current' });
      expect(result.data).toEqual({ name: 'ci', core: '/core' });
    });

    it('a machine where the CLI never ran answers default, and creates nothing', async () => {
      const [tool] = createProfileTools(reader());
      const result: any = await tool.execute({ action: 'current' });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'default' });
      expect(fs.existsSync(file)).toBe(false);
    });
  });

  describe('list', () => {
    it('returns every profile name and the active one', async () => {
      writeStore({ activeProfile: 'prod', profiles: { default: {}, prod: {}, staging: {} } });
      const [tool] = createProfileTools(reader());
      const result: any = await tool.execute({ action: 'list' });
      expect(result.success).toBe(true);
      // Same payload as `evolith profile list --format json`.
      expect(result.data).toEqual({ profiles: ['default', 'prod', 'staging'], active: 'prod' });
    });

    it('sees a profile the CLI created after the server booted', async () => {
      writeStore({ activeProfile: 'default', profiles: { default: {} } });
      const [tool] = createProfileTools(reader());
      expect(((await tool.execute({ action: 'list' })) as any).data.profiles).toEqual(['default']);

      writeStore({ activeProfile: 'default', profiles: { default: {}, later: {} } });
      expect(((await tool.execute({ action: 'list' })) as any).data.profiles).toEqual(['default', 'later']);
    });
  });

  it('rejects an unknown action — the write actions are not on this surface', async () => {
    const [tool] = createProfileTools(reader());
    for (const action of ['switch', 'create', 'delete']) {
      const error: any = await tool.execute({ action }).catch((e) => e);
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.message).toMatch(/action must be one of: current, list/);
    }
  });

  it('surfaces a corrupt store as an IO_ERROR thrown to the dispatcher', async () => {
    fs.writeFileSync(file, '{ this is not json');
    const [tool] = createProfileTools(reader());
    const error: any = await tool.execute({ action: 'list' }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('IO_ERROR');
    expect(error.message).toContain('evolith-profile failed:');
  });
});
