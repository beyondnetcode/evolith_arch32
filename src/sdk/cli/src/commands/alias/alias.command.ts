// src/commands/alias/alias.command.ts
import { Command, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { AliasService } from '../../config/alias.service';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';

interface AliasCommandOptions {
  add?: string;
  remove?: string;
  list?: boolean;
}

@Command({ name: 'alias', description: 'Manage CLI command aliases' })
@Injectable()
export class AliasCommand extends BaseEvolithCommand {
  constructor(private readonly aliasService: AliasService) {
    super('AliasCommand');
  }

  async executeCommand(_: string[], options?: AliasCommandOptions): Promise<void> {
    if (options?.add) {
      const [alias, cmd] = options.add.split('=');
      if (!alias || !cmd) {
        this.promptService.showError('Usage: evolith alias --add <alias>=<command>');
        return;
      }
      try {
        this.aliasService.add(alias.trim(), cmd.trim());
        this.promptService.showSuccess(`Alias \"${alias}\" → \"${cmd}\" added.`);
      } catch (e) {
        this.promptService.showError(e instanceof Error ? e.message : String(e));
      }
    } else if (options?.remove) {
      try {
        this.aliasService.remove(options.remove);
        this.promptService.showSuccess(`Alias \"${options.remove}\" removed.`);
      } catch (e) {
        this.promptService.showError(e instanceof Error ? e.message : String(e));
      }
    } else if (options?.list) {
      const all = this.aliasService.getAll();
      if (Object.keys(all).length === 0) {
        this.promptService.showInfo('No aliases defined.');
        return;
      }
      this.promptService.showInfo('Defined aliases:');
      for (const [a, c] of Object.entries(all)) {
        this.promptService.showInfo(`  \"${a}\" → \"${c}\"`);
      }
    } else {
      this.promptService.showInfo('Use --add, --remove, or --list.');
    }
  }

  @Option({ flags: '--add <alias=command>', description: 'Add a new alias (format: alias=command)' })
  parseAdd(val: string): string {
    return val;
  }

  @Option({ flags: '--remove <alias>', description: 'Remove an existing alias' })
  parseRemove(val: string): string {
    return val;
  }

  @Option({ flags: '--list', description: 'List all aliases' })
  parseList(): boolean {
    return true;
  }
}
