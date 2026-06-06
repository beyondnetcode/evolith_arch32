import { IFileSystem } from '../interfaces';

export interface ADR {
  id: string;
  number: number;
  title: string;
  status: ADRStatus;
  date: string;
  context: string;
  decision: string;
  consequences: ADRConsequences;
  relatedAdrs?: string[];
  tags?: string[];
}

export type ADRStatus = 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded' | 'Amended';

export interface ADRConsequences {
  positive: string[];
  negative: string[];
  neutral?: string[];
}

export class ADRService {
  private readonly fs: IFileSystem;
  private readonly adrDir: string;

  constructor(fs: IFileSystem, basePath: string) {
    this.fs = fs;
    this.adrDir = `${basePath}/reference/architecture/adrs`;
  }

  async create(input: CreateADRInput): Promise<ADR> {
    const adrNumber = await this.getNextNumber();
    const adr: ADR = {
      id: `ADR-${String(adrNumber).padStart(4, '0')}`,
      number: adrNumber,
      title: input.title,
      status: 'Proposed',
      date: new Date().toISOString().split('T')[0],
      context: input.context,
      decision: input.decision,
      consequences: input.consequences,
      relatedAdrs: input.relatedAdrs || [],
      tags: input.tags || [],
    };

    await this.fs.ensureDir(this.adrDir);
    await this.fs.writeJson(`${this.adrDir}/ADR-${String(adrNumber).padStart(4, '0')}.json`, adr);
    await this.fs.writeFile(`${this.adrDir}/ADR-${String(adrNumber).padStart(4, '0')}.md`, this.renderMarkdown(adr));

    await this.updateMatrix(adr);

    return adr;
  }

  async list(): Promise<ADR[]> {
    const exists = await this.fs.exists(this.adrDir);
    if (!exists) return [];

    const files = await this.fs.readdirNames(this.adrDir);
    const adrs: ADR[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const adr = await this.fs.readJson<ADR>(`${this.adrDir}/${file}`);
        adrs.push(adr);
      }
    }

    return adrs.sort((a, b) => b.number - a.number);
  }

  async get(idOrNumber: string): Promise<ADR | undefined> {
    const adrs = await this.list();
    return adrs.find(a =>
      a.id === idOrNumber ||
      a.id === `ADR-${idOrNumber}` ||
      `ADR-${String(a.number).padStart(4, '0')}` === idOrNumber
    );
  }

  async updateStatus(id: string, status: ADRStatus, reason?: string): Promise<ADR | undefined> {
    const adr = await this.get(id);
    if (!adr) return undefined;

    const updated: ADR = {
      ...adr,
      status,
      consequences: {
        ...adr.consequences,
        neutral: reason ? [...(adr.consequences.neutral || []), `Status changed to ${status}: ${reason}`] : adr.consequences.neutral,
      },
    };

    await this.fs.writeJson(`${this.adrDir}/${adr.id}.json`, updated);
    await this.fs.writeFile(`${this.adrDir}/${adr.id}.md`, this.renderMarkdown(updated));

    return updated;
  }

  async getMatrix(): Promise<ADCMatrix> {
    const adrs = await this.list();
    return {
      adrs,
      lastUpdated: new Date().toISOString(),
      summary: {
        total: adrs.length,
        proposed: adrs.filter(a => a.status === 'Proposed').length,
        accepted: adrs.filter(a => a.status === 'Accepted').length,
        deprecated: adrs.filter(a => a.status === 'Deprecated').length,
      },
    };
  }

  private async getNextNumber(): Promise<number> {
    const adrs = await this.list();
    if (adrs.length === 0) return 1;
    return Math.max(...adrs.map(a => a.number)) + 1;
  }

  private async updateMatrix(adr: ADR): Promise<void> {
    const matrix = await this.getMatrix();
    await this.fs.writeJson(`${this.adrDir}/adr-matrix.json`, matrix);
  }

  private renderMarkdown(adr: ADR): string {
    return `# ${adr.id}: ${adr.title}

## Status
${adr.status}

## Date
${adr.date}

## Context
${adr.context}

## Decision
${adr.decision}

## Consequences
### Positive
${adr.consequences.positive.map(p => `- ${p}`).join('\n')}

### Negative
${adr.consequences.negative.map(n => `- ${n}`).join('\n')}

${adr.consequences.neutral && adr.consequences.neutral.length > 0 ? `### Neutral
${adr.consequences.neutral.map(n => `- ${n}`).join('\n')}` : ''}

${adr.relatedAdrs && adr.relatedAdrs.length > 0 ? `## Related ADRs
${adr.relatedAdrs.map(r => `- ${r}`).join('\n')}` : ''}

${adr.tags && adr.tags.length > 0 ? `## Tags
${adr.tags.map(t => `\`${t}\``).join(' ')}` : ''}

---
[Back to ADR Matrix](./adr-matrix.md)
`;
  }
}

export interface CreateADRInput {
  title: string;
  context: string;
  decision: string;
  consequences: ADRConsequences;
  relatedAdrs?: string[];
  tags?: string[];
}

export interface ADCMatrix {
  adrs: ADR[];
  lastUpdated: string;
  summary: {
    total: number;
    proposed: number;
    accepted: number;
    deprecated: number;
  };
}