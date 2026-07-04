import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SatelliteListTool } from './satellite-list.tool';

const satellite = {
  id: '12345678-90ab-cdef-1234-567890abcdef',
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

describe('SatelliteListTool', () => {
  async function registryDir(records: unknown[]) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'evolith-satellites-'));
    await fs.writeFile(path.join(dir, 'satellite-registry.json'), JSON.stringify(records), 'utf-8');
    return dir;
  }

  it('returns registered satellites as JSON by default', async () => {
    const tool = new SatelliteListTool();
    const dir = await registryDir([satellite]);

    await expect(tool.execute({ path: dir })).resolves.toEqual({
      tool: 'evolith-satellite-list',
      count: 1,
      satellites: [satellite],
    });
  });

  it('returns an empty JSON result when the registry is absent', async () => {
    const tool = new SatelliteListTool();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'evolith-empty-'));

    await expect(tool.execute({ path: dir })).resolves.toEqual({
      tool: 'evolith-satellite-list',
      count: 0,
      satellites: [],
    });
  });

  it('formats registered satellites as a markdown table', async () => {
    const tool = new SatelliteListTool();
    const dir = await registryDir([satellite]);

    const result = await tool.execute({ path: dir, format: 'table' });

    expect(result).toContain('| ID | Name | Owner | Topology | Phase | Status | Mode |');
    expect(result).toContain('| 12345678 | UMS | Architecture | modular-monolith | construction | active | adopted |');
  });

  it('returns a friendly table message when no satellites are registered', async () => {
    const tool = new SatelliteListTool();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'evolith-empty-table-'));

    await expect(tool.execute({ path: dir, format: 'table' })).resolves.toBe('No satellites registered.');
  });
});
