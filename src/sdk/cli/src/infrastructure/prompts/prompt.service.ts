import * as p from '@clack/prompts';
import type { Option } from '@clack/prompts';
import chalk from 'chalk';
import { CatalogLoader } from '../catalog/catalog-loader';
import { InitProjectInput } from '@beyondnet/evolith-core-domain/application/services';
import { Injectable } from '@nestjs/common';
import { UserCancelledError } from '@beyondnet/evolith-core-domain/domain/errors';
import { runInitPromptGroup } from './init-prompt-group';
import { assertInteractive, isInteractiveSession } from './interactivity';

/**
 * GT-611 — every interactive method on this service asserts the machine
 * contract before it renders anything. `PromptService` is the single prompt
 * channel of the CLI (enforced by `non-interactive-contract.spec.ts`), so the
 * assertion here is the assertion for `init`, `validate`, `upgrade`,
 * `phase-advance`, `adr`, `waiver`, `chat`, `enforce`, `agents` and every
 * command added after this one.
 */
@Injectable()
export class PromptService {
  private spinner?: ReturnType<typeof p.spinner>;

  /** Exposed so a command can branch on interactivity instead of prompting and catching. */
  isInteractive(): boolean {
    return isInteractiveSession();
  }

  showIntro(message: string): void {
    if (typeof p.intro === 'function') p.intro(message);
    else console.log(message);
  }

  showOutro(message: string): void {
    if (typeof p.outro === 'function') p.outro(message);
    else console.log(message);
  }

  showInfo(message: string): void { this.writeLog('info', message); }
  showSuccess(message: string): void { this.writeLog('success', chalk.green(message)); }
  showWarning(message: string): void { this.writeLog('warn', chalk.yellow(message)); }
  showError(message: string): void { this.writeLog('error', chalk.red(message)); }

  startSpinner(message: string): void {
    if (typeof p.spinner === 'function') {
      this.spinner = p.spinner();
      this.spinner.start(message);
    } else {
      console.log(message);
    }
  }

  stopSpinner(message?: string): void {
    if (this.spinner) {
      this.spinner.stop(message);
      this.spinner = undefined;
    }
  }

  async confirm(message: string, initialValue: boolean = true): Promise<boolean> {
    assertInteractive(
      `a confirmation ("${message}")`,
      'Pass the decision as a flag (e.g. --yes) instead of relying on a prompt.',
    );
    const result = await p.confirm({ message, initialValue });
    if (this.isCancelled(result)) {
      p.cancel('Operación cancelada.');
      throw new UserCancelledError();
    }
    return result as boolean;
  }

  async text(options: {
    message: string;
    placeholder?: string;
    defaultValue?: string;
    validate?: (value: string) => string | undefined;
  }): Promise<string> {
    assertInteractive(`a text answer ("${options.message}")`);
    const result = await p.text({
      ...options,
      validate: options.validate ? (value) => options.validate!(value ?? '') : undefined,
    });
    if (this.isCancelled(result)) {
      p.cancel('Operación cancelada.');
      throw new UserCancelledError();
    }
    return result as string;
  }

  async select<T extends string>(options: {
    message: string;
    options: { value: T; label?: string; hint?: string }[];
    initialValue?: T;
  }): Promise<T> {
    assertInteractive(`a selection ("${options.message}")`);
    const result = await p.select({
      ...options,
      options: options.options.map((option) => ({ ...option, label: option.label ?? option.value })) as Option<T>[],
    });
    if (this.isCancelled(result)) {
      p.cancel('Operación cancelada.');
      throw new UserCancelledError();
    }
    return result as T;
  }

  async multiselect<T extends string>(options: {
    message: string;
    options: { value: T; label?: string; hint?: string }[];
    required?: boolean;
    initialValues?: T[];
  }): Promise<T[]> {
    assertInteractive(`a multiple selection ("${options.message}")`);
    const result = await p.multiselect({
      ...options,
      options: options.options.map((option) => ({ ...option, label: option.label ?? option.value })) as Option<T>[],
    });
    if (this.isCancelled(result)) {
      p.cancel('Operación cancelada.');
      throw new UserCancelledError();
    }
    return result as T[];
  }

  async askInitOptions(catalog: CatalogLoader): Promise<Partial<InitProjectInput> | null> {
    // `runInitPromptGroup` drives @clack/prompts directly, so the assertion has
    // to happen here — this is the only door into it.
    assertInteractive(
      'the init wizard',
      'Use --name/--yes or --config <evolith.setup.json> for a non-interactive init.',
    );
    return runInitPromptGroup(catalog);
  }

  private isCancelled(value: unknown): boolean {
    return typeof p.isCancel === 'function' && p.isCancel(value);
  }

  private writeLog(level: 'info' | 'success' | 'warn' | 'error', message: string): void {
    const logger = p.log?.[level];
    if (typeof logger === 'function') logger(message);
    else console.log(message);
  }
}
