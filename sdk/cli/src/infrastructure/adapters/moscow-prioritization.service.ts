import * as path from 'path';
import { IFileSystem } from '../../core/abstractions';
import { NodeFileSystemProvider } from '../../core/abstractions/providers/node-filesystem.provider';

export type MoscowPriority = 'MUST' | 'SHOULD' | 'COULD' | 'WONT';

export interface MoscowItem {
  id: string;
  description: string;
  priority: MoscowPriority;
  category: string;
  rationale: string;
  phase: string;
}

export interface MoscowAnalysis {
  repository: string;
  phase: string;
  items: MoscowItem[];
  summary: {
    must: number;
    should: number;
    could: number;
    wont: number;
    total: number;
  };
  createdAt: string;
  updatedAt: string;
}

export class MoscowPrioritizationService {
  private readonly fs: IFileSystem;

  constructor(options?: { fileSystem?: any; logger?: any }) {
    this.fs = options?.fileSystem ?? new NodeFileSystemProvider().createFileSystem();
  }

  async createAnalysis(repoPath: string, phase: string, items: Omit<MoscowItem, 'id'>[]): Promise<MoscowAnalysis> {
    const analysis: MoscowAnalysis = {
      repository: repoPath,
      phase,
      items: items.map((item, index) => ({
        ...item,
        id: `${phase.toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
      })),
      summary: {
        must: 0,
        should: 0,
        could: 0,
        wont: 0,
        total: items.length,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    analysis.summary.must = analysis.items.filter(i => i.priority === 'MUST').length;
    analysis.summary.should = analysis.items.filter(i => i.priority === 'SHOULD').length;
    analysis.summary.could = analysis.items.filter(i => i.priority === 'COULD').length;
    analysis.summary.wont = analysis.items.filter(i => i.priority === 'WONT').length;

    await this.saveAnalysis(repoPath, phase, analysis);

    return analysis;
  }

  async loadAnalysis(repoPath: string, phase: string): Promise<MoscowAnalysis | null> {
    const analysisPath = this.getAnalysisPath(repoPath, phase);

    if (await this.fs.exists(analysisPath)) {
      const content = await this.fs.readFile(analysisPath);
      return JSON.parse(content) as MoscowAnalysis;
    }

    return null;
  }

  async updateItem(repoPath: string, phase: string, itemId: string, updates: Partial<MoscowItem>): Promise<MoscowAnalysis | null> {
    const analysis = await this.loadAnalysis(repoPath, phase);
    if (!analysis) return null;

    const itemIndex = analysis.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return null;

    analysis.items[itemIndex] = { ...analysis.items[itemIndex], ...updates };
    analysis.updatedAt = new Date().toISOString();

    analysis.summary.must = analysis.items.filter(i => i.priority === 'MUST').length;
    analysis.summary.should = analysis.items.filter(i => i.priority === 'SHOULD').length;
    analysis.summary.could = analysis.items.filter(i => i.priority === 'COULD').length;
    analysis.summary.wont = analysis.items.filter(i => i.priority === 'WONT').length;

    await this.saveAnalysis(repoPath, phase, analysis);

    return analysis;
  }

  async removeItem(repoPath: string, phase: string, itemId: string): Promise<MoscowAnalysis | null> {
    const analysis = await this.loadAnalysis(repoPath, phase);
    if (!analysis) return null;

    analysis.items = analysis.items.filter(i => i.id !== itemId);
    analysis.summary.total = analysis.items.length;
    analysis.updatedAt = new Date().toISOString();

    analysis.summary.must = analysis.items.filter(i => i.priority === 'MUST').length;
    analysis.summary.should = analysis.items.filter(i => i.priority === 'SHOULD').length;
    analysis.summary.could = analysis.items.filter(i => i.priority === 'COULD').length;
    analysis.summary.wont = analysis.items.filter(i => i.priority === 'WONT').length;

    await this.saveAnalysis(repoPath, phase, analysis);

    return analysis;
  }

  async listAnalyses(repoPath: string): Promise<Array<{ phase: string; path: string; updatedAt: string }>> {
    const moscoDir = path.join(repoPath, '.evolith', 'moscow');
    const analyses: Array<{ phase: string; path: string; updatedAt: string }> = [];

    if (await this.fs.exists(moscoDir)) {
      const entries = await this.fs.readdirNames(moscoDir);
      for (const entry of entries) {
        if (entry.endsWith('.json')) {
          const phase = entry.replace('.json', '');
          const analysisPath = path.join(moscoDir, entry);
          const stat = await this.fs.stat(analysisPath);
          analyses.push({
            phase,
            path: analysisPath,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    return analyses;
  }

  validateAnalysis(analysis: MoscowAnalysis): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (analysis.items.length === 0) {
      issues.push('No items in analysis');
    }

    const mustItems = analysis.items.filter(i => i.priority === 'MUST');
    if (mustItems.length === 0) {
      issues.push('No MUST items defined - at least one is required');
    }

    if (mustItems.length > analysis.items.length * 0.6) {
      issues.push('Too many MUST items (>60%) - MoSCoW loses effectiveness');
    }

    const invalidPriorities = analysis.items.filter(i => !['MUST', 'SHOULD', 'COULD', 'WONT'].includes(i.priority));
    if (invalidPriorities.length > 0) {
      issues.push(`Invalid priorities found: ${invalidPriorities.map(i => i.priority).join(', ')}`);
    }

    const duplicateIds = analysis.items.filter((item, index) =>
      analysis.items.findIndex(i => i.id === item.id) !== index
    );
    if (duplicateIds.length > 0) {
      issues.push(`Duplicate IDs found: ${duplicateIds.map(i => i.id).join(', ')}`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  generateReport(analysis: MoscowAnalysis): string {
    const lines = [
      `# MoSCoW Prioritization Report`,
      ``,
      `**Repository:** ${analysis.repository}`,
      `**Phase:** ${analysis.phase}`,
      `**Created:** ${analysis.createdAt}`,
      `**Updated:** ${analysis.updatedAt}`,
      ``,
      `## Summary`,
      ``,
      `| Priority | Count | Percentage |`,
      `|----------|-------|------------|`,
      `| MUST | ${analysis.summary.must} | ${this.percentage(analysis.summary.must, analysis.summary.total)} |`,
      `| SHOULD | ${analysis.summary.should} | ${this.percentage(analysis.summary.should, analysis.summary.total)} |`,
      `| COULD | ${analysis.summary.could} | ${this.percentage(analysis.summary.could, analysis.summary.total)} |`,
      `| WONT | ${analysis.summary.wont} | ${this.percentage(analysis.summary.wont, analysis.summary.total)} |`,
      `| **Total** | **${analysis.summary.total}** | **100%** |`,
      ``,
      `## Items by Priority`,
      ``,
    ];

    for (const priority of ['MUST', 'SHOULD', 'COULD', 'WONT'] as MoscowPriority[]) {
      const items = analysis.items.filter(i => i.priority === priority);
      if (items.length > 0) {
        lines.push(`### ${priority}`);
        lines.push(``);
        for (const item of items) {
          lines.push(`- **${item.id}**: ${item.description}`);
          lines.push(`  - Category: ${item.category}`);
          lines.push(`  - Rationale: ${item.rationale}`);
          lines.push(``);
        }
      }
    }

    const validation = this.validateAnalysis(analysis);
    if (!validation.valid) {
      lines.push(`## Validation Issues`);
      lines.push(``);
      for (const issue of validation.issues) {
        lines.push(`- ⚠️ ${issue}`);
      }
      lines.push(``);
    }

    return lines.join('\n');
  }

  private percentage(count: number, total: number): string {
    if (total === 0) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  }

  private getAnalysisPath(repoPath: string, phase: string): string {
    return path.join(repoPath, '.evolith', 'moscow', `${phase}.json`);
  }

  private async saveAnalysis(repoPath: string, phase: string, analysis: MoscowAnalysis): Promise<void> {
    const analysisPath = this.getAnalysisPath(repoPath, phase);
    await this.fs.ensureDir(path.dirname(analysisPath));
    await this.fs.writeJson(analysisPath, analysis);
  }
}
