import { Injectable, Inject } from '@nestjs/common';
import type { IFileSystem } from '@beyondnet/evolith-core';
import { FILE_SYSTEM } from '../domain/domain.tokens';

export interface CorpusEntry {
  uri: string;
  name: string;
  type: 'ruleset' | 'topology' | 'adr';
  path: string;
}

function inferType(filename: string): 'ruleset' | 'topology' | 'adr' {
  if (filename.includes('opa')) return 'ruleset';
  if (filename.includes('topolog')) return 'topology';
  return 'adr';
}

@Injectable()
export class CorpusResourceHandler {
  constructor(
    @Inject(FILE_SYSTEM) private readonly fs: IFileSystem,
  ) {}

  async listCorpusResources(corpusPath: string): Promise<CorpusEntry[]> {
    const entries = await this.fs.readdirNames(corpusPath);
    return entries.map((filename) => ({
      uri: `evolith://corpus/${filename}`,
      name: filename,
      type: inferType(filename),
      path: `${corpusPath}/${filename}`,
    }));
  }
}
