import { Logger } from '@nestjs/common';
import * as readline from 'node:readline';

export interface ConfirmationOptions {
  skipConfirm?: boolean;
  stdin?: NodeJS.ReadStream;
  stdout?: NodeJS.WriteStream;
  timeoutMs?: number;  // Timeout for confirmation prompt (default: 30000ms)
}

export class ConfirmationService {
  private readonly logger = new Logger(ConfirmationService.name);
  private readonly skipConfirm: boolean;
  private readonly stdin: NodeJS.ReadStream;
  private readonly stdout: NodeJS.WriteStream;
  private readonly timeoutMs: number;

  constructor(options: ConfirmationOptions = {}) {
    this.skipConfirm = options.skipConfirm ?? false;
    this.stdin = options.stdin ?? process.stdin;
    this.stdout = options.stdout ?? process.stdout;
    this.timeoutMs = options.timeoutMs ?? 30000;  // Default 30 seconds
  }

  async confirmMutation(
    toolName: string,
    targetDescription: string,
  ): Promise<boolean> {
    if (this.skipConfirm) {
      this.logger.debug(`Confirmation skipped for '${toolName}' on '${targetDescription}'`);
      return true;
    }

    if (!this.stdin.isTTY) {
      this.logger.warn(
        `STDIN is not a TTY. Confirmation for '${toolName}' on '${targetDescription}' cannot be interactive. ` +
        `Use --no-confirm flag or set 'mcp.allowMutations: true' in evolith.yaml.`,
      );
      return false;
    }

    const prompt = `⚠️  MUTATIVE OPERATION\n   Tool: ${toolName}\n   Target: ${targetDescription}\n\n   Proceed? (y/N): `;

    return new Promise<boolean>((resolve) => {
      const rl = readline.createInterface({
        input: this.stdin,
        output: this.stdout,
      });

      let resolved = false;

      // Timeout handling
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          rl.close();
          this.logger.warn(
            `Confirmation timeout for '${toolName}' after ${this.timeoutMs}ms. Denying by default.`,
          );
          resolved = true;
          resolve(false);
        }
      }, this.timeoutMs);

      rl.question(prompt, (answer) => {
        if (!resolved) {
          clearTimeout(timeoutId);
          rl.close();
          const confirmed = answer.toLowerCase().trim() === 'y';
          if (confirmed) {
            this.logger.debug(`Confirmation granted for '${toolName}'`);
          } else {
            this.logger.debug(`Confirmation denied for '${toolName}'`);
          }
          resolved = true;
          resolve(confirmed);
        }
      });
    });
  }
}
