import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SatelliteStatusTool } from './satellite-status.tool';

const satellite = {
  id: 'abcdef12-3456-7890-abcd-ef1234567890',
  name: 'UMS',
  owner: 'Architecture',
  repoUrl: 'https://github.com/beyondnetcode/ums',
  cloneUrl: 'https://github.com/beyondnetcode/ums.git',
  sshUrl: 'git@github.com:beyondnetcode/ums.git',
  topology: 'modular-monolith',
  phase: 'construction',
  status: 'active',
  mode: 'adopted',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('SatelliteStatusTool', () => {
  async function registryDir(records: unknown[]) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'evolith-satellite-status-'));
    await fs.writeFile(path.join(dir, 'satellite-registry.json'), JSON.stringify(records), 'utf-8');
    return dir;
  }

  it('returns a satellite by full id', async () => {
    const tool = new SatelliteStatusTool();
    const dir = await registryDir([satellite]);

    await expect(tool.execute({ path: dir, id: satellite.id })).resolves.toEqual({
      tool: 'evolith-satellite-status',
      found: true,
      satellite,
    });
  });

  it('returns a satellite by id prefix', async () => {
    const tool = new SatelliteStatusTool();
    const dir = await registryDir([satellite]);

    await expect(tool.execute({ path: dir, id: 'abcdef12' })).resolves.toEqual({
      tool: 'evolith-satellite-status',
      found: true,
      satellite,
    });
  });

  it('returns a not found result when the registry has no matching satellite', async () => {
    const tool = new SatelliteStatusTool();
    const dir = await registryDir([satellite]);

    await expect(tool.execute({ path: dir, id: 'missing' })).resolves.toEqual({
      tool: 'evolith-satellite-status',
      found: false,
      id: 'missing',
      error: "Satellite with id 'missing' not found in registry.",
    });
  });

  it('throws when id is missing', async () => {
    const tool = new SatelliteStatusTool();

    await expect(tool.execute({})).rejects.toThrow('id is required');
  });
});
