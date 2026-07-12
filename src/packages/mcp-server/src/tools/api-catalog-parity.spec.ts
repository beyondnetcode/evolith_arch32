import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { ToolRegistryService } from '../mcp/tool-registry.service';
import { ResourcesService } from '../mcp/resources.service';
// The CLI `api --list` catalog. It is generated from this same MCP server
// (scripts/gen-api-catalog.mjs → api.catalog.generated.ts) and its counts are
// derived from these arrays' `.length` (never hardcoded). This cross-package
// import is test-only.
import {
  TOOLS as CLI_TOOLS,
  RESOURCES as CLI_RESOURCES,
  CATEGORIES as CLI_CATEGORIES,
} from '../../../../sdk/cli/src/commands/api/api.catalog';

/**
 * GT-460 drift guard. The CLI `api --list` MCP tool/resource counts used to be
 * hardcoded and silently drifted from the live server. This test boots the real
 * MCP registry (the same DI graph as tools-registration.spec.ts / GT-482) and
 * asserts the checked-in CLI catalog matches it exactly — so adding a tool or
 * resource to the server without regenerating the CLI catalog
 * (`npm run gen:api-catalog`) fails here instead of shipping a wrong count.
 */
describe('api catalog parity with live MCP registry (GT-460)', () => {
  let liveToolNames: string[];
  let liveResourceUris: string[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const registry = moduleRef.get(ToolRegistryService, { strict: false });
    const resources = moduleRef.get(ResourcesService, { strict: false });
    liveToolNames = registry.listSchemas().map((s) => s.name);
    liveResourceUris = (await resources.list()).resources.map((r) => r.uri);
  });

  it('CLI tool set equals the live registry tool set (names + count)', () => {
    const cliNames = CLI_TOOLS.map((t) => t.name);

    // Precise diff before the set assertion.
    const missingFromCli = liveToolNames.filter((n) => !cliNames.includes(n));
    const staleInCli = cliNames.filter((n) => !liveToolNames.includes(n));
    expect({ missingFromCli, staleInCli }).toEqual({ missingFromCli: [], staleInCli: [] });

    expect(new Set(cliNames)).toEqual(new Set(liveToolNames));
    expect(CLI_TOOLS.length).toBe(liveToolNames.length);
  });

  it('CLI resource set equals the live registry resource set (uris + count)', () => {
    const cliUris = CLI_RESOURCES.map((r) => r.uri);

    const missingFromCli = liveResourceUris.filter((u) => !cliUris.includes(u));
    const staleInCli = cliUris.filter((u) => !liveResourceUris.includes(u));
    expect({ missingFromCli, staleInCli }).toEqual({ missingFromCli: [], staleInCli: [] });

    expect(new Set(cliUris)).toEqual(new Set(liveResourceUris));
    expect(CLI_RESOURCES.length).toBe(liveResourceUris.length);
  });

  it('the `api --list` summary counts equal the live registry counts', () => {
    const toolsCategory = CLI_CATEGORIES.find((c) => c.name === 'tools');
    const resourcesCategory = CLI_CATEGORIES.find((c) => c.name === 'resources');

    // Counts are rendered from `TOOLS.length` / `RESOURCES.length`, so they must
    // literally contain the live counts.
    expect(toolsCategory?.description).toContain(String(liveToolNames.length));
    expect(resourcesCategory?.description).toContain(String(liveResourceUris.length));
  });
});
