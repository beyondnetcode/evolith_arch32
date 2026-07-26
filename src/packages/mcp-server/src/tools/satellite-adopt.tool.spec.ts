import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SatelliteAdoptTool } from './satellite-adopt.tool';

const repoResponse = {
  id: 1,
  name: 'ums',
  full_name: 'beyondnetcode/ums',
  clone_url: 'https://github.com/beyondnetcode/ums.git',
  ssh_url: 'git@github.com:beyondnetcode/ums.git',
  html_url: 'https://github.com/beyondnetcode/ums',
  private: false,
  default_branch: 'main',
};

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

function errResponse(status: number) {
  return { ok: false, status, json: async () => ({}) } as unknown as Response;
}

async function tempDir(prefix = 'evolith-adopt-') {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function readRegistry(dir: string): Promise<any[]> {
  const raw = await fs.readFile(path.join(dir, 'satellite-registry.json'), 'utf-8');
  return JSON.parse(raw);
}

describe('SatelliteAdoptTool', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exposes its schema and mutative/scope metadata', () => {
    const tool = new SatelliteAdoptTool();
    expect(tool.schema.name).toBe('evolith-satellite-adopt');
    expect(tool.schema.inputSchema.required).toEqual(['repoUrl', 'token']);
    expect(tool.mutative).toBe(true);
    expect(tool.scope).toBe('write');
  });

  it('adopts an existing repository from an https URL (happy path)', async () => {
    fetchSpy.mockResolvedValueOnce(okResponse(repoResponse));
    const dir = await tempDir();
    const tool = new SatelliteAdoptTool();

    const result = (await tool.execute({
      repoUrl: 'https://github.com/beyondnetcode/ums',
      token: 'tok',
      topology: 'distributed',
      phase: 'qa',
      path: dir,
    })) as { satellite: any };

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/beyondnetcode/ums');
    expect(init.headers.Authorization).toBe('Bearer tok');

    expect(result.satellite).toMatchObject({
      name: 'ums',
      owner: 'beyondnetcode',
      repoUrl: repoResponse.html_url,
      cloneUrl: repoResponse.clone_url,
      sshUrl: repoResponse.ssh_url,
      topology: 'distributed',
      phase: 'qa',
      status: 'linked',
      mode: 'adopt',
    });
    expect(typeof result.satellite.id).toBe('string');
    expect(result.satellite.linkedAt).toBe(result.satellite.createdAt);
    expect(result.satellite.createdAt).toBe(result.satellite.updatedAt);

    const registry = await readRegistry(dir);
    expect(registry).toHaveLength(1);
    expect(registry[0].name).toBe('ums');
  });

  it('parses an ssh (git@) URL and applies default topology/phase', async () => {
    fetchSpy.mockResolvedValueOnce(okResponse(repoResponse));
    const dir = await tempDir();
    const tool = new SatelliteAdoptTool();

    const result = (await tool.execute({
      repoUrl: 'git@github.com:beyondnetcode/ums.git',
      token: 'tok',
      path: dir,
    })) as { satellite: any };

    expect(fetchSpy.mock.calls[0][0]).toBe('https://api.github.com/repos/beyondnetcode/ums');
    expect(result.satellite.topology).toBe('modular');
    expect(result.satellite.phase).toBe('discovery');
  });

  it('honors an explicit owner override', async () => {
    fetchSpy.mockResolvedValueOnce(okResponse(repoResponse));
    const dir = await tempDir();
    const tool = new SatelliteAdoptTool();

    await tool.execute({
      repoUrl: 'https://github.com/beyondnetcode/ums',
      token: 'tok',
      owner: 'otherorg',
      path: dir,
    });

    expect(fetchSpy.mock.calls[0][0]).toBe('https://api.github.com/repos/otherorg/ums');
  });

  it('defaults the registry path to process.cwd() when path is omitted', async () => {
    fetchSpy.mockResolvedValueOnce(okResponse(repoResponse));
    const dir = await tempDir();
    jest.spyOn(process, 'cwd').mockReturnValue(dir);
    const tool = new SatelliteAdoptTool();

    await tool.execute({ repoUrl: 'https://github.com/beyondnetcode/ums', token: 'tok' });

    const registry = await readRegistry(dir);
    expect(registry).toHaveLength(1);
  });

  it('appends to an existing registry file', async () => {
    fetchSpy.mockResolvedValueOnce(okResponse(repoResponse));
    const dir = await tempDir();
    await fs.writeFile(
      path.join(dir, 'satellite-registry.json'),
      JSON.stringify([{ id: 'existing', name: 'old' }]),
      'utf-8',
    );
    const tool = new SatelliteAdoptTool();

    await tool.execute({
      repoUrl: 'https://github.com/beyondnetcode/ums',
      token: 'tok',
      path: dir,
    });

    const registry = await readRegistry(dir);
    expect(registry).toHaveLength(2);
    expect(registry[1].name).toBe('ums');
  });

  it('throws Repository not found when the repo returns 404', async () => {
    fetchSpy.mockResolvedValueOnce(errResponse(404));
    const dir = await tempDir();
    const tool = new SatelliteAdoptTool();

    await expect(
      tool.execute({ repoUrl: 'https://github.com/beyondnetcode/ums', token: 'tok', path: dir }),
    ).rejects.toThrow('Repository not found: beyondnetcode/ums');
  });

  it('throws a GitHub API error on a non-404 failure', async () => {
    fetchSpy.mockResolvedValueOnce(errResponse(500));
    const dir = await tempDir();
    const tool = new SatelliteAdoptTool();

    await expect(
      tool.execute({ repoUrl: 'https://github.com/beyondnetcode/ums', token: 'tok', path: dir }),
    ).rejects.toThrow('GitHub API error 500: GET /repos/beyondnetcode/ums');
  });

  it('throws when the repoUrl cannot be parsed', async () => {
    const tool = new SatelliteAdoptTool();
    await expect(
      tool.execute({ repoUrl: 'https://gitlab.com/foo/bar', token: 'tok' }),
    ).rejects.toThrow('Cannot parse GitHub repository URL: https://gitlab.com/foo/bar');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws when repoUrl is missing (and never calls fetch)', async () => {
    const tool = new SatelliteAdoptTool();
    await expect(tool.execute({ token: 'tok' })).rejects.toThrow('repoUrl is required');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws when token is missing', async () => { delete process.env.GITHUB_TOKEN;
    const tool = new SatelliteAdoptTool();
    await expect(
      tool.execute({ repoUrl: 'https://github.com/beyondnetcode/ums' }),
    ).rejects.toThrow('token is required');
  });
});
