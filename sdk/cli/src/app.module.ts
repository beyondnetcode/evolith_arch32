import { Module } from '@nestjs/common';
import { InitCommand } from './commands/init.command';
import { AgentsCommand } from './commands/agents.command';
import { ValidateCommand } from './commands/validate.command';
import { DocsCommand } from './commands/docs.command';
import { UpgradeCommand } from './commands/upgrade.command';
import { DaemonCommand } from './commands/daemon.command';
import { ConfigService } from './config/config.service';
import { FileManagerService } from './utils/file-manager.service';
import { SyncService } from './sync/sync.service';
import { WatcherService } from './daemon/watcher.service';
import { McpServerService } from './daemon/mcp-server.service';

@Module({
  imports: [],
  providers: [
    InitCommand,
    AgentsCommand,
    ValidateCommand,
    DocsCommand,
    UpgradeCommand,
    DaemonCommand,
    ConfigService,
    FileManagerService,
    SyncService,
    WatcherService,
    McpServerService
  ],
})
export class AppModule {}
