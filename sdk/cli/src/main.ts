#!/usr/bin/env node
import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';
import { AliasService } from './config/alias.service';

async function bootstrap() {
  // Resolve possible alias for the first command argument
  const aliasService = new AliasService();
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const resolved = aliasService.resolve(args[0]);
    if (resolved !== args[0]) {
      args[0] = resolved;
      // Rebuild argv with resolved command
      process.argv = [process.argv[0], process.argv[1], ...args];
    }
  }
  await CommandFactory.run(AppModule, ['warn', 'error']);
}

bootstrap();
