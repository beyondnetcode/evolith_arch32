import { Injectable } from '@nestjs/common';
import { clack as p } from './clack';
import chalk from 'chalk';

export interface ProgressOptions {
  total?: number;
  message?: string;
  quiet?: boolean;
  isTTY?: boolean;
}

@Injectable()
export class ProgressService {
  private spinner?: ReturnType<typeof p.spinner>;
  private current = 0;
  private total = 0;
  private message = '';
  private quiet = false;
  private ttyEnabled = true;

  start(options: ProgressOptions = {}): void {
    this.total = options.total ?? 0;
    this.message = options.message ?? '';
    this.quiet = options.quiet ?? false;
    this.ttyEnabled = options.isTTY ?? process.stdout.isTTY ?? true;
    this.current = 0;

    if (this.quiet || !this.ttyEnabled) {
      if (this.message) {
        console.log(this.message);
      }
      return;
    }

    this.spinner = p.spinner();
    this.spinner.start(this.formatMessage());
  }

  update(current: number, total?: number, message?: string): void {
    this.current = current;
    if (total !== undefined) {
      this.total = total;
    }
    if (message !== undefined) {
      this.message = message;
    }

    if (this.quiet || !this.ttyEnabled) {
      if (message) {
        console.log(message);
      }
      return;
    }

    if (this.spinner) {
      this.spinner.message(this.formatMessage());
    }
  }

  increment(message?: string): void {
    this.current++;
    if (message) {
      this.message = message;
    }

    if (this.quiet || !this.ttyEnabled) {
      if (message) {
        console.log(message);
      }
      return;
    }

    if (this.spinner) {
      this.spinner.message(this.formatMessage());
    }
  }

  stop(message?: string): void {
    if (this.quiet || !this.ttyEnabled) {
      if (message) {
        console.log(message);
      }
      return;
    }

    if (this.spinner) {
      this.spinner.stop(message);
      this.spinner = undefined;
    }

    this.current = 0;
    this.total = 0;
    this.message = '';
  }

  succeed(message?: string): void {
    if (this.quiet || !this.ttyEnabled) {
      if (message) {
        console.log(chalk.green(message));
      }
      return;
    }

    if (this.spinner) {
      this.spinner.stop(message ?? chalk.green('Done'));
      this.spinner = undefined;
    }

    this.current = 0;
    this.total = 0;
    this.message = '';
  }

  fail(message?: string): void {
    if (this.quiet || !this.ttyEnabled) {
      if (message) {
        console.log(chalk.red(message));
      }
      return;
    }

    if (this.spinner) {
      this.spinner.stop(message ?? chalk.red('Failed'));
      this.spinner = undefined;
    }

    this.current = 0;
    this.total = 0;
    this.message = '';
  }

  private formatMessage(): string {
    if (this.total <= 0) {
      return this.message;
    }

    const percentage = Math.min(100, Math.round((this.current / this.total) * 100));
    const bar = this.formatProgressBar(percentage);

    if (this.message) {
      return `${this.message} ${bar} ${percentage}%`;
    }

    return `${bar} ${percentage}%`;
  }

  private formatProgressBar(percentage: number): string {
    const width = 20;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    const greenPart = chalk.green('='.repeat(filled));
    const grayPart = chalk.gray('.'.repeat(empty));

    return `[${greenPart}${grayPart}]`;
  }

  isQuiet(): boolean {
    return this.quiet;
  }

  isTTY(): boolean {
    return this.ttyEnabled;
  }
}
