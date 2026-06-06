import * as path from 'path';
import { promises as fs } from 'fs';
import { commandExecutor, CommandResult } from '../command-executor';

export class NpmProvider {
  async init(cwd: string): Promise<CommandResult> {
    return commandExecutor.execute('npm init -y', cwd);
  }

  async install(cwd: string, flags?: string): Promise<CommandResult> {
    return commandExecutor.execute(`npm install ${flags || ''}`, cwd);
  }

  async installDev(deps: string[], cwd: string): Promise<CommandResult> {
    return commandExecutor.execute(`npm install -D ${deps.join(' ')}`, cwd);
  }

  async run(script: string, cwd: string): Promise<CommandResult> {
    return commandExecutor.execute(`npm run ${script}`, cwd);
  }

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
    return commandExecutor.execute(`dotnet new ${template} -n ${name} -o .`, cwd);
  }

  async build(cwd: string, config?: string): Promise<CommandResult> {
    const cmd = config ? `dotnet build -c ${config}` : 'dotnet build';
    return commandExecutor.execute(cmd, cwd);
  }

  async test(cwd: string): Promise<CommandResult> {
    return commandExecutor.execute('dotnet test', cwd);
  }

  async run(cwd: string): Promise<CommandResult> {
    return commandExecutor.execute('dotnet run', cwd);
  }

  async addPackage(packageName: string, cwd: string): Promise<CommandResult> {
    return commandExecutor.execute(`dotnet add package ${packageName}`, cwd);
  }

  async restore(cwd: string): Promise<CommandResult> {
    return commandExecutor.execute('dotnet restore', cwd);
  }

  async isAvailable(): Promise<boolean> {
    const check = await commandExecutor.checkTool('dotnet', 'dotnet --version');
    return check.available;
  }
}

export class PythonProvider {
  async install(packages: string[], cwd: string): Promise<CommandResult> {
    return commandExecutor.execute(`pip install ${packages.join(' ')}`, cwd);
  }

  async installRequirements(cwd: string): Promise<CommandResult> {
    return commandExecutor.execute('pip install -r requirements.txt', cwd);
  }

  async runModule(module: string, cwd: string): Promise<CommandResult> {
    return commandExecutor.execute(`python -m ${module}`, cwd);
  }

  async runPytest(cwd: string, flags?: string): Promise<CommandResult> {
    return commandExecutor.execute(`pytest ${flags || ''}`, cwd);
  }

  async formatBlack(cwd: string): Promise<CommandResult> {
    return commandExecutor.execute('black .', cwd);
  }

  async lintRuff(cwd: string): Promise<CommandResult> {
    return commandExecutor.execute('ruff check .', cwd);
  }

  async typeCheckMypy(cwd: string): Promise<CommandResult> {
    return commandExecutor.execute('mypy .', cwd);
  }

  async isAvailable(): Promise<boolean> {
    const check = await commandExecutor.checkTool('python', 'python --version');
    return check.available;
  }
}

export class DockerProvider {
  async build(imageName: string, dockerfile: string, cwd: string): Promise<CommandResult> {
    return commandExecutor.execute(`docker build -t ${imageName} -f ${dockerfile} .`, cwd);
  }

  async run(containerName: string, imageName: string, ports: string): Promise<CommandResult> {
    return commandExecutor.execute(`docker run --name ${containerName} -p ${ports} ${imageName}`);
  }

  async composeUp(cwd: string, detached = false): Promise<CommandResult> {
    const cmd = detached ? 'docker-compose up -d' : 'docker-compose up';
    return commandExecutor.execute(cmd, cwd);
  }

  async composeDown(cwd: string): Promise<CommandResult> {
    return commandExecutor.execute('docker-compose down', cwd);
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
    return commandExecutor.execute(`npx nx generate ${template} ${appName}`, cwd);
  }

  async build(cwd: string, target?: string): Promise<CommandResult> {
    const cmd = target ? `npx nx build ${target}` : 'npx nx build';
    return commandExecutor.execute(cmd, cwd);
  }

  async serve(cwd: string, target?: string): Promise<CommandResult> {
    const cmd = target ? `npx nx serve ${target}` : 'npx nx serve';
    return commandExecutor.execute(cmd, cwd);
  }

  async affectedBuild(cwd: string): Promise<CommandResult> {
    return commandExecutor.execute('npx nx affected:build', cwd);
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