import * as os from 'node:os';
import * as path from 'node:path';
import * as fsExtra from 'fs-extra';
import { NodeFileSystemProvider } from '@beyondnet/evolith-infra-providers';
import { createAutoFixTools } from './auto-fix.tools';
import { McpTool } from '../mcp/tool.interface';

const fs = new NodeFileSystemProvider().createFileSystem();

describe('auto-fix tool', () => {
  let dir: string;
  let tool: McpTool;

  beforeEach(async () => {
    dir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'evolith-fix-'));
    tool = createAutoFixTools(fs)[0];
  });
  afterEach(() => fsExtra.remove(dir));

  it('previews fixes in dry-run without modifying files', async () => {
    await fsExtra.writeFile(path.join(dir, 'svc.ts'), "import { Injectable } from '@nestjs/common';\n");
    const result = (await tool.execute({
      rulesetId: 'domain-purity',
      dir,
      dryRun: true,
      violations: [{ ruleId: 'domain-purity', filePath: 'svc.ts', message: 'framework import' }],
    })) as { fixesApplied: number; fixesPreview: unknown[] };
    expect(result.fixesApplied).toBe(0);
    expect(result.fixesPreview).toHaveLength(1);
    expect(await fsExtra.readFile(path.join(dir, 'svc.ts'), 'utf-8')).toContain("@nestjs/common");
  });

  it('applies a fix and rewrites the file', async () => {
    await fsExtra.writeFile(path.join(dir, 'svc.ts'), "import { Injectable } from '@nestjs/common';\n");
    const result = (await tool.execute({
      rulesetId: 'domain-purity',
      dir,
      violations: [{ ruleId: 'domain-purity', filePath: 'svc.ts', message: 'framework import' }],
    })) as { fixesApplied: number };
    expect(result.fixesApplied).toBe(1);
    expect(await fsExtra.readFile(path.join(dir, 'svc.ts'), 'utf-8')).toContain('[AUTO-FIXED]');
  });

  it('applies hexagonal, service-purity and dependency-injection strategies', async () => {
    await fsExtra.writeFile(path.join(dir, 'a.ts'), "import x from '../core'\nconst y = new Foo()\nconsole.log('hi')\n");
    const result = (await tool.execute({
      rulesetId: 'mixed',
      dir,
      violations: [
        { ruleId: 'hexagonal-boundaries', filePath: 'a.ts', message: 'm' },
        { ruleId: 'service-purity', filePath: 'a.ts', message: 'm' },
        { ruleId: 'dependency-injection', filePath: 'a.ts', message: 'm' },
      ],
    })) as { fixesApplied: number };
    expect(result.fixesApplied).toBe(3);
    expect(await fsExtra.readFile(path.join(dir, 'a.ts'), 'utf-8')).toContain('[AUTO-FIXED]');
  });

  it('generates a missing domain interface stub', async () => {
    const result = (await tool.execute({
      rulesetId: 'missing-domain-interface',
      dir,
      violations: [{ ruleId: 'missing-domain-interface', filePath: 'port.ts', message: 'm', suggestedFix: 'interface IRepo' }],
    })) as { fixesApplied: number };
    expect(result.fixesApplied).toBe(1);
    expect(await fsExtra.readFile(path.join(dir, 'port.ts'), 'utf-8')).toContain('export interface IRepo');
  });

  it('marks unknown rules as manual-review-required', async () => {
    const result = (await tool.execute({
      rulesetId: 'unknown-rule',
      dir,
      violations: [{ ruleId: 'unknown-rule', filePath: 'x.ts', message: 'n/a' }],
    })) as { summary: string; fixesApplied: number };
    expect(result.fixesApplied).toBe(0);
    expect(result.summary).toContain('Manual Review: 1');
  });
});
