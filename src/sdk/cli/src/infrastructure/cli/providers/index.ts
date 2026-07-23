import * as path from 'path';
import { promises as fs } from 'fs';
import { commandExecutor, CommandResult } from '../command-executor';

/**
 * GT-346: providers build argument ARRAYS and run them shell-free via
 * `commandExecutor.executeFile`. Package names, scripts, templates, flags, etc.
 * are passed as literal argv entries, so shell metacharacters in them cannot be
 * interpreted (no command injection). A raw flag string is split on whitespace
 * into discrete args.
 */
function splitFlags(flags?: string): string[] {
  return flags ? flags.trim().split(/\s+/).filter(Boolean) : [];
}

export class NpmProvider {
  async init(cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('npm', ['init', '-y'], cwd);
  }

  async install(cwd: string, flags?: string): Promise<CommandResult> {
    return commandExecutor.executeFile('npm', ['install', ...splitFlags(flags)], cwd);
  }

  async installDev(deps: string[], cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('npm', ['install', '-D', ...deps], cwd);
  }

  async run(script: string, cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('npm', ['run', script], cwd);
  }

  /**
   * Raw passthrough escape hatch — caller owns the command string (still shell).
   * @deprecated Use specific methods (install, run, etc.) instead. This method
   * runs through a shell and is an injection vector if user-controlled data is
   * passed as part of the command string.
   */
  async exec(cmd: string, cwd: string): Promise<CommandResult> {
    return commandExecutor.execute(cmd, cwd);
  }

  async isAvailable(): Promise<boolean> {
    const check = await commandExecutor.checkTool('npm', 'npm --version');
    return check.available;
  }
}

export class DotnetProvider {
  async new(template: string, name: string, cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('dotnet', ['new', template, '-n', name, '-o', '.'], cwd);
  }

  async build(cwd: string, config?: string): Promise<CommandResult> {
    const args = config ? ['build', '-c', config] : ['build'];
    return commandExecutor.executeFile('dotnet', args, cwd);
  }

  async test(cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('dotnet', ['test'], cwd);
  }

  async run(cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('dotnet', ['run'], cwd);
  }

  async addPackage(packageName: string, cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('dotnet', ['add', 'package', packageName], cwd);
  }

  async restore(cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('dotnet', ['restore'], cwd);
  }

  async isAvailable(): Promise<boolean> {
    const check = await commandExecutor.checkTool('dotnet', 'dotnet --version');
    return check.available;
  }
}

export class PythonProvider {
  async install(packages: string[], cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('pip', ['install', ...packages], cwd);
  }

  async installRequirements(cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('pip', ['install', '-r', 'requirements.txt'], cwd);
  }

  async runModule(module: string, cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('python', ['-m', module], cwd);
  }

  async runPytest(cwd: string, flags?: string): Promise<CommandResult> {
    return commandExecutor.executeFile('pytest', splitFlags(flags), cwd);
  }

  async formatBlack(cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('black', ['.'], cwd);
  }

  async lintRuff(cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('ruff', ['check', '.'], cwd);
  }

  async typeCheckMypy(cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('mypy', ['.'], cwd);
  }

  async isAvailable(): Promise<boolean> {
    const check = await commandExecutor.checkTool('python', 'python --version');
    return check.available;
  }
}

export class DockerProvider {
  async build(imageName: string, dockerfile: string, cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('docker', ['build', '-t', imageName, '-f', dockerfile, '.'], cwd);
  }

  async run(containerName: string, imageName: string, ports: string): Promise<CommandResult> {
    return commandExecutor.executeFile('docker', ['run', '--name', containerName, '-p', ports, imageName]);
  }

  async composeUp(cwd: string, detached = false): Promise<CommandResult> {
    const args = detached ? ['up', '-d'] : ['up'];
    return commandExecutor.executeFile('docker-compose', args, cwd);
  }

  async composeDown(cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('docker-compose', ['down'], cwd);
  }

  async isAvailable(): Promise<boolean> {
    const check = await commandExecutor.checkTool('docker', 'docker --version');
    return check.available;
  }

  async isComposeAvailable(): Promise<boolean> {
    const check = await commandExecutor.checkTool('docker-compose', 'docker-compose --version');
    return check.available;
  }
}

export class NxProvider {
  async generate(appName: string, template: string, cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('npx', ['nx', 'generate', template, appName], cwd);
  }

  async build(cwd: string, target?: string): Promise<CommandResult> {
    const args = target ? ['nx', 'build', target] : ['nx', 'build'];
    return commandExecutor.executeFile('npx', args, cwd);
  }

  async serve(cwd: string, target?: string): Promise<CommandResult> {
    const args = target ? ['nx', 'serve', target] : ['nx', 'serve'];
    return commandExecutor.executeFile('npx', args, cwd);
  }

  async affectedBuild(cwd: string): Promise<CommandResult> {
    return commandExecutor.executeFile('npx', ['nx', 'affected:build'], cwd);
  }

  async isAvailable(): Promise<boolean> {
    const check = await commandExecutor.checkTool('nx', 'npx nx --version');
    return check.available;
  }
}

export class GitHubActionsProvider {
  async createWorkflowFile(name: string, content: string, repoPath: string): Promise<void> {
    const workflowDir = path.join(repoPath, '.github', 'workflows');
    await fs.mkdir(workflowDir, { recursive: true });
    await fs.writeFile(path.join(workflowDir, `${name}.yml`), content);
  }
}

export const npmProvider = new NpmProvider();
export const dotnetProvider = new DotnetProvider();
export const pythonProvider = new PythonProvider();
export const dockerProvider = new DockerProvider();
export const nxProvider = new NxProvider();
export const githubActionsProvider = new GitHubActionsProvider();
