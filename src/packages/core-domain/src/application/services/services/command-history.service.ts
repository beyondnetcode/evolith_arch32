import * as fs from 'fs-extra';
import * as path from 'path';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  command: string;
  args: string[];
  exitCode: number;
  durationMs: number;
  success: boolean;
}

export interface CommandHistory {
  entries: HistoryEntry[];
  lastUpdated: string;
}

export class CommandHistoryService {
  private readonly historyFile: string;
  private history: CommandHistory;
  private entryCounter = 0;
  private initialized = false;

  constructor(repoPath?: string) {
    const basePath = repoPath || process.env.HOME || '/root';
    const evolithDir = path.join(basePath, '.evolith');
    this.historyFile = path.join(evolithDir, 'history.jsonl');
    this.history = { entries: [], lastUpdated: new Date().toISOString() };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    const dir = path.dirname(this.historyFile);
    await fs.ensureDir(dir);

    if (await fs.pathExists(this.historyFile)) {
      const content = await fs.readFile(this.historyFile, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as HistoryEntry;
          const num = parseInt(entry.id.replace('h-', ''), 10);
          if (!isNaN(num) && num > this.entryCounter) {
            this.entryCounter = num;
          }
          this.history.entries.push(entry);
        } catch {
          // Skip malformed lines
        }
      }

      // Keep only last N entries (configurable via env)
      const maxEntries = Number(process.env.COMMAND_HISTORY_MAX_ENTRIES) || 1000;
      if (this.history.entries.length > maxEntries) {
        this.history.entries = this.history.entries.slice(-maxEntries);
      }
    }
  }

  async record(command: string, args: string[], exitCode: number, durationMs: number): Promise<string> {
    await this.initialize();

    const id = `h-${String(++this.entryCounter).padStart(6, '0')}`;
    const entry: HistoryEntry = {
      id,
      timestamp: new Date().toISOString(),
      command,
      args,
      exitCode,
      durationMs,
      success: exitCode === 0,
    };

    this.history.entries.push(entry);
    this.history.lastUpdated = new Date().toISOString();

    await fs.appendFile(this.historyFile, JSON.stringify(entry) + '\n');

    return id;
  }

  async list(limit = Number(process.env.COMMAND_HISTORY_DEFAULT_LIMIT) || 50, offset = 0): Promise<HistoryEntry[]> {
    await this.initialize();

    return this.history.entries
      .slice(-limit - offset)
      .slice(offset)
      .reverse();
  }

  async get(id: string): Promise<HistoryEntry | undefined> {
    await this.initialize();

    return this.history.entries.find(e => e.id === id);
  }

  async search(query: string): Promise<HistoryEntry[]> {
    await this.initialize();

    const lowerQuery = query.toLowerCase();
    return this.history.entries.filter(e =>
      e.command.toLowerCase().includes(lowerQuery) ||
      e.args.some(a => a.toLowerCase().includes(lowerQuery))
    ).reverse();
  }

  async clear(): Promise<void> {
    this.history.entries = [];
    this.history.lastUpdated = new Date().toISOString();

    if (await fs.pathExists(this.historyFile)) {
      await fs.remove(this.historyFile);
    }
  }

  async stats(): Promise<{
    totalCommands: number;
    successRate: string;
    mostUsed: Array<{ command: string; count: number }>;
    recentCommands: number;
  }> {
    await this.initialize();

    const total = this.history.entries.length;
    const successful = this.history.entries.filter(e => e.success).length;
    const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) + '%' : '0%';

    const recent = this.history.entries.filter(e => {
      const diff = Date.now() - new Date(e.timestamp).getTime();
      return diff < (Number(process.env.COMMAND_HISTORY_RECENT_WINDOW_MS) || 24 * 60 * 60 * 1000);
    }).length;

    const usageMap = new Map<string, number>();
    for (const entry of this.history.entries) {
      usageMap.set(entry.command, (usageMap.get(entry.command) || 0) + 1);
    }

    const mostUsed = Array.from(usageMap.entries())
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCommands: total,
      successRate,
      mostUsed,
      recentCommands: recent,
    };
  }

  async replay(id: string): Promise<{ command: string; args: string[] } | undefined> {
    const entry = await this.get(id);
    if (!entry) return undefined;

    return {
      command: entry.command,
      args: entry.args,
    };
  }
}