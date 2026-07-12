import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SatelliteCreateTool } from './satellite-create.tool';

const repoResponse = {
  id: 1,
  name: 'my-sat',
  full_name: 'beyondnetcode/my-sat',
  clone_url: 'https://github.com/beyondnetcode/my-sat.git',
  ssh_url: 'git@github.com:beyondnetcode/my-sat.git',
  html_url: 'https://github.com/beyondnetcode/my-sat',
  private: false,
  default_branch: 'main',
};

function okResponse(body: unknown) {
  return { ok: true, status: 201, json: async () => body } as unknown as Response;
}

function errResponse(status: number) {
  return { ok: false, status, json: async () => ({}) } as unknown as Response;
}

async function tempDir(prefix = 'evolith-create-') {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function readRegistry(dir: string): Promise<any[]> {
  const raw = await fs.readFile(path.join(dir, 'satellite-registry.json'), 'utf-8');
  return JSON.parse(raw);
}

describe('SatelliteCreateTool', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exposes its schema and mutative/scope metadata', () => {
    const tool = new SatelliteCreateTool();
    expect(tool.schema.name).toBe('evolith-satellite-create');
    expect(tool.schema.inputSchema.required).toEqual(['token', 'name', 'owner']);
    expect(tool.mutative).toBe(true);
    expect(tool.scope).toBe('write');
  });

  it('creates the repository via /orgs and persists the record (happy path)', async () => {
    fetchSpy.mockResolvedValueOnce(okResponse(repoResponse));
    const dir = await tempDir();
    const tool = new SatelliteCreateTool();

    const result = (await tool.execute({
      token: 'tok',
      name: 'my-sat',
      owner: 'beyondnetcode',
      topology: 'micro',
      phase: 'design',
      description: 'A sat',
      private: true,
      path: dir,
    })) as { satellite: any };

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.github.com/orgs/beyondnetcode/repos');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toMatchObject({
      name: 'my-sat',
      description: 'A sat',
      private: true,
      auto_init: true,
    });

    expect(result.satellite).toMatchObject({
      name: 'my-sat',
      owner: 'beyondnetcode',
      repoUrl: repoResponse.html_url,
      cloneUrl: repoResponse.clone_url,
      sshUrl: repoResponse.ssh_url,
      topology: 'micro',
      phase: 'design',
      status: 'provisioning',
      mode: 'create',
      description: 'A sat',
    });
    expect(typeof result.satellite.id).toBe('string');
    expect(result.satellite.createdAt).toBe(result.satellite.updatedAt);

    const registry = await readRegistry(dir);
    expect(registry).toHaveLength(1);
    expect(registry[0].name).toBe('my-sat');
  });

  it('applies default topology/phase and private=false when omitted', async () => {
    fetchSpy.mockResolvedValueOnce(okResponse(repoResponse));
    const dir = await tempDir();
    const tool = new SatelliteCreateTool();

    const result = (await tool.execute({
      token: 'tok',
      name: 'my-sat',
      owner: 'beyondnetcode',
      path: dir,
    })) as { satellite: any };

    expect(result.satellite.topology).toBe('modular');
    expect(result.satellite.phase).toBe('discovery');
    expect(result.satellite.description).toBeUndefined();
    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse(init.body).private).toBe(false);
  });

  it('falls back to /user/repos when /orgs returns 404', async () => {
    fetchSpy
      .mockResolvedValueOnce(errResponse(404))
      .mockResolvedValueOnce(okResponse(repoResponse));
    const dir = await tempDir();
    const tool = new SatelliteCreateTool();

    const result = (await tool.execute({
      token: 'tok',
      name: 'my-sat',
      owner: 'someuser',
      path: dir,
    })) as { satellite: any };

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[1][0]).toBe('https://api.github.com/user/repos');
    expect(result.satellite.name).toBe('my-sat');
  });

  it('falls back to /user/repos when /orgs returns 422', async () => {
    fetchSpy
      .mockResolvedValueOnce(errResponse(422))
      .mockResolvedValueOnce(okResponse(repoResponse));
    const dir = await tempDir();
    const tool = new SatelliteCreateTool();

    await expect(
      tool.execute({ token: 'tok', name: 'my-sat', owner: 'someuser', path: dir }),
    ).resolves.toBeDefined();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('throws when the /user/repos fallback also fails', async () => {
    fetchSpy
      .mockResolvedValueOnce(errResponse(404))
      .mockResolvedValueOnce(errResponse(403));
    const dir = await tempDir();
    const tool = new SatelliteCreateTool();

    await expect(
      tool.execute({ token: 'tok', name: 'my-sat', owner: 'x', path: dir }),
    ).rejects.toThrow('GitHub API error 403: POST /user/repos');
  });

  it('throws on a non-404/422 /orgs error without falling back', async () => {
    fetchSpy.mockResolvedValueOnce(errResponse(500));
    const dir = await tempDir();
    const tool = new SatelliteCreateTool();

    await expect(
      tool.execute({ token: 'tok', name: 'my-sat', owner: 'beyondnetcode', path: dir }),
    ).rejects.toThrow('GitHub API error 500: POST /orgs/beyondnetcode/repos');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('appends to an existing registry file', async () => {
    fetchSpy.mockResolvedValueOnce(okResponse(repoResponse));
    const dir = await tempDir();
    const existing = [{ id: 'existing', name: 'old' }];
    await fs.writeFile(
      path.join(dir, 'satellite-registry.json'),
      JSON.stringify(existing),
      'utf-8',
    );
    const tool = new SatelliteCreateTool();

    await tool.execute({ token: 'tok', name: 'my-sat', owner: 'beyondnetcode', path: dir });

    const registry = await readRegistry(dir);
    expect(registry).toHaveLength(2);
    expect(registry[0].name).toBe('old');
    expect(registry[1].name).toBe('my-sat');
  });

  it('defaults the registry path to process.cwd() when path is omitted', async () => {
    fetchSpy.mockResolvedValueOnce(okResponse(repoResponse));
    const dir = await tempDir();
    jest.spyOn(process, 'cwd').mockReturnValue(dir);
    const tool = new SatelliteCreateTool();

    await tool.execute({ token: 'tok', name: 'my-sat', owner: 'beyondnetcode' });

    const registry = await readRegistry(dir);
    expect(registry).toHaveLength(1);
  });

  it('throws when token is missing (and never calls fetch)', async () => {
    const tool = new SatelliteCreateTool();
    await expect(tool.execute({ name: 'x', owner: 'y' })).rejects.toThrow('token is required');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws when name is missing', async () => {
    const tool = new SatelliteCreateTool();
    await expect(tool.execute({ token: 't', owner: 'y' })).rejects.toThrow('name is required');
  });

  it('throws when owner is missing', async () => {
    const tool = new SatelliteCreateTool();
    await expect(tool.execute({ token: 't', name: 'x' })).rejects.toThrow('owner is required');
  });
});
