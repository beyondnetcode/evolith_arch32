import { Module } from '@nestjs/common';
import { InitCommand } from './commands/init.command';
import { AgentsCommand } from './commands/agents.command';
import { ValidateCommand } from './commands/validate.command';
import { DocsCommand } from './commands/docs.command';
import { UpgradeCommand } from './commands/upgrade.command';
import { ConfigService } from './config/config.service';

@Module({
  imports: [],
  providers: [
    InitCommand,
    AgentsCommand,
    ValidateCommand,
    DocsCommand,
    UpgradeCommand,
    ConfigService
  ],
})
export class AppModule {}
