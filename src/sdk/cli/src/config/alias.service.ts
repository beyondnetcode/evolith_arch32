// src/config/alias.service.ts
import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';

export interface AliasMap {
  [alias: string]: string;
}

@Injectable()
export class AliasService {
  private readonly aliasFile: string;
  private aliases: AliasMap = {};

  constructor() {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    const dir = path.join(home, '.evolith');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.aliasFile = path.join(dir, 'aliases.json');
    this.load();
  }

  private load() {
    if (fs.existsSync(this.aliasFile)) {
      try {
        const data = fs.readFileSync(this.aliasFile, 'utf-8');
        this.aliases = JSON.parse(data);
      } catch {
        this.aliases = {};
      }
    }
  }

  private save() {
    fs.writeFileSync(this.aliasFile, JSON.stringify(this.aliases, null, 2), 'utf-8');
  }

  getAll(): AliasMap {
    return { ...this.aliases };
  }

  add(alias: string, command: string): void {
    if (this.aliases[alias]) {
      throw new Error(`Alias \"${alias}\" already exists`);
    }
    if (Object.keys(this.aliases).includes(command)) {
      throw new Error(`Cannot alias to an existing command name \"${command}\"`);
    }
    this.aliases[alias] = command;
    this.save();
  }

  remove(alias: string): void {
    if (!this.aliases[alias]) {
      throw new Error(`Alias \"${alias}\" not found`);
    }
    delete this.aliases[alias];
    this.save();
  }

  resolve(aliasOrCommand: string): string {
    return this.aliases[aliasOrCommand] || aliasOrCommand;
  }
}
