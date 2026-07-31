import * as fs from 'node:fs';
import { Test } from '@nestjs/testing';
import { buildCapabilityManifest } from '@beyondnet/evolith-core-domain/capabilities/capabilities-manifest';
import { AppModule } from './src/app.module';
import { ToolRegistryService } from './src/mcp/tool-registry.service';

async function main() {
  const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const registry = ref.get(ToolRegistryService, { strict: false });
  const operations = registry.operationProjection();
  const manifest = buildCapabilityManifest({ operations });
  fs.writeFileSync("/Users/beyondnet/Source/evolith/.claude/worktrees/frosty-hermann-c0dfa8/src/packages/mcp-server/__capability-operations.json", JSON.stringify({ manifest, registered: registry.list().length }));
  await ref.close();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
