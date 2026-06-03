import { Module } from '@nestjs/common';
import { InitCommand } from './commands/init.command';
import { ConfigService } from './config/config.service';

@Module({
  imports: [],
  providers: [InitCommand, ConfigService],
})
export class AppModule {}
