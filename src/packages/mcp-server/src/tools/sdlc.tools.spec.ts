import * as os from 'node:os';
import * as path from 'node:path';
import * as fsExtra from 'fs-extra';
import { NodeFileSystemProvider, YamlConfigParserProvider } from '@beyondnet/evolith-infra-providers';
import { createSdlcTools } from './sdlc.tools';
import { McpTool } from '../mcp/tool.interface';

const fs = new NodeFileSystemProvider().createFileSystem();
const configParser = new YamlConfigParserProvider().createConfigParser('yaml');

function byName(tools: McpTool[], name: string): McpTool {
  return tools.find((t) => t.schema.name === name)!;
}

describe('sdlc tools', () => {
  let dir: string;
  let tools: McpTool[];

  beforeEach(async () => {
    dir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'evolith-sdlc-'));
    tools = createSdlcTools(fs, configParser);
  });
  afterEach(() => fsExtra.remove(dir));

  it('reports phase status from evolith.yaml', async () => {
    await fsExtra.writeFile(path.join(dir, 'evolith.yaml'), 'product:\n  phase: phase-1\n');
    const status = (await byName(tools, 'evolith-sdlc-status').execute({ path: dir })) as {
      currentPhase: string;
      phaseStatus: unknown[];
      nextPhase: string;
    };
    expect(status.currentPhase).toBe('phase-1');
    expect(status.phaseStatus).toHaveLength(6);
    expect(status.nextPhase).toBe('phase-2');
  });

  it('requires path', async () => {
    expect(await byName(tools, 'evolith-sdlc-status').execute({})).toMatchObject({ error: true });
  });

  it('rejects a non-consecutive handoff', async () => {
    await expect(
      byName(tools, 'evolith-sdlc-handoff').execute({ path: dir, fromPhase: 'phase-0', toPhase: 'phase-3' }),
    ).rejects.toThrow('next consecutive phase');
  });

  it('reports a non-git directory for DORA metrics', async () => {
    const result = await byName(tools, 'evolith-dora-metrics').execute({ path: dir });
    expect(result).toMatchObject({ error: true, message: 'Not a git repository' });
  });

  it('generates a handoff manifest when the source phase is complete', async () => {
    // Make phase-0 "complete": its artifacts present, and currentPhase >= phase-0.
    await fsExtra.writeFile(path.join(dir, 'evolith.yaml'), 'product:\n  phase: phase-1\n');
    await fsExtra.writeFile(path.join(dir, 'README.md'), '# demo\n');
    await fsExtra.ensureDir(path.join(dir, '.evolith', 'moscow'));
    await fsExtra.writeJson(path.join(dir, '.evolith', 'moscow', 'phase-0.json'), { items: [] });

    const manifest = (await byName(tools, 'evolith-sdlc-handoff').execute({
      path: dir,
      fromPhase: 'phase-0',
      toPhase: 'phase-1',
    })) as { handoff: { fromPhase: string; toPhase: string }; recommendations: string[] };

    expect(manifest.handoff).toMatchObject({ fromPhase: 'phase-0', toPhase: 'phase-1' });
    expect(manifest.recommendations.length).toBeGreaterThan(0);
    expect(await fsExtra.pathExists(path.join(dir, '.evolith', 'handoff-manifest.json'))).toBe(true);
  });
});
