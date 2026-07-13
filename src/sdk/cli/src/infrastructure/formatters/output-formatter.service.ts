import chalk from 'chalk';

export type OutputFormat = 'json' | 'table' | 'yaml' | 'markdown';

export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export interface FormatterOptions {
  format: OutputFormat;
  colors?: boolean;
  indent?: number;
}

export class OutputFormatterService {
  format(data: unknown, options: FormatterOptions): string {
    switch (options.format) {
      case 'table':
        return this.formatTable(data, options);
      case 'yaml':
        return this.formatYaml(data, options);
      case 'markdown':
        return this.formatMarkdown(data, options);
      case 'json':
      default:
        return this.formatJson(data, options);
    }
  }

  formatJson(data: unknown, _options: FormatterOptions): string {
    return JSON.stringify(data, null, 2);
  }

  formatYaml(data: unknown, _options: FormatterOptions): string {
    try {
      return this.toYaml(data);
    } catch {
      console.warn('YAML formatting failed, falling back to JSON');
      return this.formatJson(data, _options);
    }
  }

  formatMarkdown(data: unknown, _options: FormatterOptions): string {
    if (Array.isArray(data)) {
      return this.tableToMarkdown(data);
    }
    if (typeof data === 'object' && data !== null) {
      return this.objectToMarkdown(data as Record<string, unknown>);
    }
    return String(data);
  }

  formatTable(data: unknown, options: FormatterOptions): string {
    if (Array.isArray(data)) {
      return this.arrayToTable(data, options);
    }
    if (typeof data === 'object' && data !== null) {
      return this.objectToTable(data as Record<string, unknown>, options);
    }
    return String(data);
  }

  private arrayToTable(data: unknown[], options: FormatterOptions): string {
    if (data.length === 0) return '(empty)';

    const firstItem = data[0];
    if (typeof firstItem !== 'object' || firstItem === null) {
      return data.map(item => String(item)).join('\n');
    }

    const keys = Object.keys(firstItem as Record<string, unknown>);
    const columns: TableColumn[] = keys.map(key => ({
      header: this.humanizeKey(key),
      key,
    }));

    return this.renderTable(data as Record<string, unknown>[], columns, options);
  }

  private objectToTable(data: Record<string, unknown>, options: FormatterOptions): string {
    const entries = Object.entries(data);
    if (entries.length === 0) return '(empty)';

    const maxKeyLength = Math.max(...entries.map(([k]) => k.length));
    const lines: string[] = [];

    for (const [key, value] of entries) {
      const valueStr = this.formatValue(value);
      const paddedKey = key.padEnd(maxKeyLength);
      lines.push(`  ${paddedKey}  ${valueStr}`);
    }

    return lines.join('\n');
  }

  private renderTable(
    data: Record<string, unknown>[],
    columns: TableColumn[],
    options: FormatterOptions
  ): string {
    if (data.length === 0) return '(empty)';

    const colWidths = columns.map(col => {
      const maxData = Math.max(
        col.header.length,
        ...data.map(row => String(row[col.key] || '').length)
      );
      return Math.min(col.width || maxData + 2, 50);
    });

    const headerRow = columns.map((col, i) =>
      col.header.padEnd(colWidths[i]).substring(0, colWidths[i])
    ).join(' | ');

    const separator = colWidths.map(w => '─'.repeat(w)).join('─┼─');

    const rows = data.map(item =>
      columns.map((col, i) => {
        const value = String(item[col.key] ?? '');
        return value.padEnd(colWidths[i]).substring(0, colWidths[i]);
      }).join(' | ')
    );

    return [headerRow, separator, ...rows].join('\n');
  }

  private humanizeKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) return chalk.gray('(none)');
    if (typeof value === 'boolean') return value ? chalk.green('✓') : chalk.red('✗');
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        // GT-457: render issue-like arrays (e.g. validate `issues`) with per-item
        // detail instead of an opaque "[N items]" count, so table output surfaces
        // the ruleId + title + description + remediation hint that were previously
        // only visible in `-f json`.
        if (value.length > 0 && this.isIssueLike(value[0])) {
          const lines = value.flatMap((it) => {
            const i = it as Record<string, unknown>;
            const ruleId = String(i.ruleId ?? '?');
            const title = i.title != null ? String(i.title) : '';
            const description = i.description != null ? String(i.description) : '';
            const primary = title || description;
            const sev = i.severity ? ` (${String(i.severity)})` : '';
            const rows = [`    - ${chalk.yellow(ruleId)}: ${primary}${sev}`];
            // Show the description on its own line when it adds detail beyond the
            // headline title (validate maps both, and they can differ).
            if (description && description !== primary) {
              rows.push(`        ${chalk.gray(description)}`);
            }
            // A remediation hint (remediation/fix/hint) tells the operator how to
            // clear the violation without switching to json output.
            const remediation = i.remediation ?? i.fix ?? i.hint;
            if (remediation != null && String(remediation).length > 0) {
              rows.push(`        ${chalk.cyan('↳ fix:')} ${String(remediation)}`);
            }
            return rows;
          });
          return `${value.length} issue(s):\n${lines.join('\n')}`;
        }
        return `[${value.length} items]`;
      }
      return JSON.stringify(value);
    }
    return String(value);
  }

  private isIssueLike(item: unknown): boolean {
    if (typeof item !== 'object' || item === null) return false;
    return 'ruleId' in item || ('title' in item && 'severity' in item);
  }

  private tableToMarkdown(data: unknown[]): string {
    if (data.length === 0) return '(empty)';

    const firstItem = data[0];
    if (typeof firstItem !== 'object' || firstItem === null) {
      return data.map(item => `- ${item}`).join('\n');
    }

    const keys = Object.keys(firstItem as Record<string, unknown>);
    const header = `| ${keys.map(k => this.humanizeKey(k)).join(' | ')} |`;
    const separator = `| ${keys.map(() => '---').join(' | ')} |`;

    const rows = data.map(item =>
      `| ${keys.map(k => {
        const val = (item as Record<string, unknown>)[k];
        return String(val ?? '');
      }).join(' | ')} |`
    );

    return [header, separator, ...rows].join('\n');
  }

  private objectToMarkdown(data: Record<string, unknown>): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;

      const formattedValue = this.formatMarkdownValue(value);
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        lines.push(`\n### ${this.humanizeKey(key)}`);
        lines.push(this.tableToMarkdown(value));
      } else {
        lines.push(`**${this.humanizeKey(key)}:** ${formattedValue}`);
      }
    }

    return lines.join('\n');
  }

  private formatMarkdownValue(value: unknown): string {
    if (value === null || value === undefined) return '(none)';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
      if (Array.isArray(value)) return value.join(', ');
      return JSON.stringify(value);
    }
    return String(value);
  }

  private toYaml(obj: unknown, indent = 0): string {
    const spaces = '  '.repeat(indent);

    if (obj === null || obj === undefined) {
      return 'null';
    }

    if (typeof obj === 'string') {
      if (obj.includes('\n') || obj.includes(':') || obj.includes('#')) {
        return `|-\n${obj.split('\n').map(line => spaces + '  ' + line).join('\n')}`;
      }
      return obj;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return obj.map(item => {
        const itemYaml = this.toYaml(item, indent + 1);
        if (itemYaml.includes('\n')) {
          return `\n${obj.map(i => spaces + '- ' + this.toYaml(i, indent + 1)).join('\n')}`;
        }
        return `${spaces}- ${itemYaml}`;
      }).join('\n');
    }

    if (typeof obj === 'object') {
      const entries = Object.entries(obj as Record<string, unknown>);
      if (entries.length === 0) return '{}';

      return entries.map(([key, value]) => {
        const valueYaml = this.toYaml(value, indent + 1);
        if (valueYaml.includes('\n') && !valueYaml.startsWith('- ')) {
          return `${spaces}${key}:\n${valueYaml}`;
        }
        return `${spaces}${key}: ${valueYaml}`;
      }).join('\n');
    }

    return String(obj);
  }
}

