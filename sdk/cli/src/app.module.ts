import { Module } from '@nestjs/common';
import { InitCommand } from './commands/init/init.command';
import { AgentsCommand } from './commands/init/agents.command';
import { ValidateCommand } from './commands/validate/validate.command';
import { DocsCommand } from './commands/docs/docs.command';
import { UpgradeCommand } from './commands/init/upgrade.command';
import { McpServeCommand } from './commands/mcp/mcp-serve.command';
import { ConfigService } from './core/config/config.service';
import { FileManagerService } from './core/filesystem/file-manager.service';
import { SyncService } from './core/sync/sync.service';
import { WatcherService } from './core/mcp/watcher.service';
import { McpServerService } from './core/mcp/mcp-server.service';
import { SdlcCommand } from './commands/sdlc/sdlc.command';
import { HandoffCommand } from './commands/sdlc/handoff.command';
import { GenerateDomainCommand } from './commands/sdlc/generate-domain.command';
import { ScaffoldCommand } from './commands/architecture/scaffold.command';

@Module({
  imports: [],
  providers: [
    InitCommand,
    AgentsCommand,
    ValidateCommand,
    DocsCommand,
    UpgradeCommand,
    McpServeCommand,
    ConfigService,
    FileManagerService,
    SyncService,
    WatcherService,
    McpServerService,
    SdlcCommand,
    HandoffCommand,
    GenerateDomainCommand,
    ScaffoldCommand
  ],
})
export class AppModule {}
