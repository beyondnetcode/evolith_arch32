import { exec } from 'child_process';
import { promisify } from 'util';
import { ICommandExecutor, PlatformCheck } from '@evolith/core-domain/domain/interfaces';
import { CommandExecutionError } from '@evolith/core-domain/domain/errors';

const execAsync = promisify(exec);

export class CommandResult {
  constructor(
    public readonly success: boolean,
    public readonly stdout: string,
    public readonly stderr: string,
    public readonly exitCode: number
  ) {}

  static ok(stdout: string): CommandResult {
    return new CommandResult(true, stdout, '', 0);
  }

  static err(stderr: string, exitCode: number): CommandResult {
    return new CommandResult(false, '', stderr, exitCode);
  }
}

export class CommandExecutor implements ICommandExecutor {
  private toolCache: Map<string, boolean> = new Map();
  private versionCache: Map<string, string> = new Map();

  async execute(command: string, cwd?: string): Promise<CommandResult> {
    try {
      const options = cwd
        ? { cwd, env: { ...process.env }, timeout: 120000 }
        : { env: { ...process.env }, timeout: 120000 };

      const { stdout, stderr: _stderr } = await execAsync(command, options);
      return CommandResult.ok(stdout);
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string; stderr?: string };
      return CommandResult.err(err.stderr || err.message || 'Unknown error', err.code || 1);
    }
  }

  async checkTool(name: string, versionCommand: string): Promise<PlatformCheck> {
    if (this.toolCache.has(name)) {
      return {
        name,
        command: versionCommand,
        available: this.toolCache.get(name)!,
        version: this.versionCache.get(name),
      };
    }

    try {
      const result = await this.execute(versionCommand);
      if (result.success) {
        const versionMatch = result.stdout.match(/\d+\.\d+\.\d+/);
        const version = versionMatch ? versionMatch[0] : undefined;

        this.toolCache.set(name, true);
        if (version) {
          this.versionCache.set(name, version);
        }

        return { name, command: versionCommand, available: true, version };
      }
    } catch {
      console.warn(`Tool check failed for "${name}", marking as unavailable`);
    }

    this.toolCache.set(name, false);
    return {
      name,
      command: versionCommand,
      available: false,
      installHint: this.getInstallHint(name),
    };
  }

  async executeOrThrow(command: string, cwd?: string): Promise<string> {
    const result = await this.execute(command, cwd);
    if (!result.success) {
      throw new CommandExecutionError(command, result.exitCode, result.stderr);
    }
    return result.stdout;
  }

  private getInstallHint(tool: string): string {
    const hints: Record<string, string> = {
      npm: 'Install Node.js from https://nodejs.org/',
      node: 'Install Node.js from https://nodejs.org/',
      npx: 'Install Node.js from https://nodejs.org/',
      nx: 'npm install -D nx @nx/node',
      dotnet: 'Install .NET from https://dotnet.microsoft.com/download',
      python: 'Install Python from https://python.org/',
      pip: 'Install Python from https://python.org/',
      docker: 'Install from https://docs.docker.com/get-docker/',
      'docker-compose': 'Install from https://docs.docker.com/compose/install/',
      kubectl: 'Install from https://kubernetes.io/docs/tasks/tools/install-kubectl/',
      helm: 'Install from https://helm.sh/docs/intro/install/',
      openbao: 'Install from https://openbao.org/downloads',
      rush: 'npm install -g @microsoft/rush',
      aws: 'Install AWS CLI from https://aws.amazon.com/cli/',
      terraform: 'Install from https://www.terraform.io/downloads',
      java: 'Install from https://adoptium.net/',
      go: 'Install from https://go.dev/dl/',
      rust: 'Install from https://rustup.rs/',
    };
    return hints[tool] || `Install ${tool} and ensure it's in your PATH`;
  }

  clearCache(): void {
    this.toolCache.clear();
    this.versionCache.clear();
  }
}

export const commandExecutor = new CommandExecutor();