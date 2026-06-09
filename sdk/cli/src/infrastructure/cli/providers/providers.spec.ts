/**
 * Tests for CLI providers: NpmProvider, DotnetProvider, PythonProvider,
 * DockerProvider, NxProvider, GitHubActionsProvider.
 *
 * Strategy: mock the commandExecutor singleton so providers delegate
 * the right command strings without spawning real child processes.
 */

import { promises as fsPromises } from 'fs';
import * as path from 'path';

// ── mock commandExecutor singleton ────────────────────────────────────────────

const mockExecute   = jest.fn();
const mockCheckTool = jest.fn();

jest.mock('../command-executor', () => ({
  CommandResult: jest.requireActual('../command-executor').CommandResult,
  CommandExecutor: jest.fn(),
  commandExecutor: {
    execute:   mockExecute,
    checkTool: mockCheckTool,
  },
}));

// ── mock fs.promises for GitHubActionsProvider ────────────────────────────────

jest.mock('fs', () => ({
  promises: {
    mkdir:     jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

import {
  NpmProvider,
  DotnetProvider,
  PythonProvider,
  DockerProvider,
  NxProvider,
  GitHubActionsProvider,
} from './index';
import { CommandResult } from '../command-executor';

// ── helpers ───────────────────────────────────────────────────────────────────

function ok(stdout = 'ok') { return CommandResult.ok(stdout); }
function fail()            { return CommandResult.err('error', 1); }

beforeEach(() => {
  jest.clearAllMocks();
  mockExecute.mockResolvedValue(ok());
  mockCheckTool.mockResolvedValue({ name: 'tool', command: '', available: true });
});

// ── NpmProvider ───────────────────────────────────────────────────────────────

describe('NpmProvider', () => {
  const p = new NpmProvider();

  it('init runs npm init -y', async () => {
    await p.init('/my/project');
    expect(mockExecute).toHaveBeenCalledWith('npm init -y', '/my/project');
  });

  it('install runs npm install with optional flags', async () => {
    await p.install('/my/project', '--legacy-peer-deps');
    expect(mockExecute).toHaveBeenCalledWith('npm install --legacy-peer-deps', '/my/project');
  });

  it('install runs npm install without flags when none provided', async () => {
    await p.install('/my/project');
    expect(mockExecute).toHaveBeenCalledWith('npm install ', '/my/project');
  });

  it('installDev joins deps with spaces', async () => {
    await p.installDev(['typescript', 'jest', 'ts-jest'], '/my/project');
    expect(mockExecute).toHaveBeenCalledWith(
      'npm install -D typescript jest ts-jest',
      '/my/project',
    );
  });

  it('run calls npm run <script>', async () => {
    await p.run('test', '/my/project');
    expect(mockExecute).toHaveBeenCalledWith('npm run test', '/my/project');
  });

  it('exec delegates raw command to execute', async () => {
    await p.exec('npx tsc --init', '/my/project');
    expect(mockExecute).toHaveBeenCalledWith('npx tsc --init', '/my/project');
  });

  it('isAvailable returns true when npm checkTool passes', async () => {
    mockCheckTool.mockResolvedValue({ available: true });
    expect(await p.isAvailable()).toBe(true);
  });

  it('isAvailable returns false when npm not found', async () => {
    mockCheckTool.mockResolvedValue({ available: false });
    expect(await p.isAvailable()).toBe(false);
  });
});

// ── DotnetProvider ────────────────────────────────────────────────────────────

describe('DotnetProvider', () => {
  const p = new DotnetProvider();

  it('new creates project with given template and name', async () => {
    await p.new('webapi', 'MyApi', '/proj');
    expect(mockExecute).toHaveBeenCalledWith(
      'dotnet new webapi -n MyApi -o .',
      '/proj',
    );
  });

  it('build runs dotnet build without config', async () => {
    await p.build('/proj');
    expect(mockExecute).toHaveBeenCalledWith('dotnet build', '/proj');
  });

  it('build uses -c flag when config is provided', async () => {
    await p.build('/proj', 'Release');
    expect(mockExecute).toHaveBeenCalledWith('dotnet build -c Release', '/proj');
  });

  it('test runs dotnet test', async () => {
    await p.test('/proj');
    expect(mockExecute).toHaveBeenCalledWith('dotnet test', '/proj');
  });

  it('run runs dotnet run', async () => {
    await p.run('/proj');
    expect(mockExecute).toHaveBeenCalledWith('dotnet run', '/proj');
  });

  it('addPackage runs dotnet add package', async () => {
    await p.addPackage('Newtonsoft.Json', '/proj');
    expect(mockExecute).toHaveBeenCalledWith(
      'dotnet add package Newtonsoft.Json',
      '/proj',
    );
  });

  it('restore runs dotnet restore', async () => {
    await p.restore('/proj');
    expect(mockExecute).toHaveBeenCalledWith('dotnet restore', '/proj');
  });

  it('isAvailable checks dotnet --version', async () => {
    await p.isAvailable();
    expect(mockCheckTool).toHaveBeenCalledWith('dotnet', 'dotnet --version');
  });
});

// ── PythonProvider ────────────────────────────────────────────────────────────

describe('PythonProvider', () => {
  const p = new PythonProvider();

  it('install joins packages in pip install command', async () => {
    await p.install(['requests', 'boto3'], '/proj');
    expect(mockExecute).toHaveBeenCalledWith(
      'pip install requests boto3',
      '/proj',
    );
  });

  it('installRequirements installs from requirements.txt', async () => {
    await p.installRequirements('/proj');
    expect(mockExecute).toHaveBeenCalledWith(
      'pip install -r requirements.txt',
      '/proj',
    );
  });

  it('runModule uses python -m', async () => {
    await p.runModule('pytest', '/proj');
    expect(mockExecute).toHaveBeenCalledWith('python -m pytest', '/proj');
  });

  it('runPytest calls pytest with optional flags', async () => {
    await p.runPytest('/proj', '-v --tb=short');
    expect(mockExecute).toHaveBeenCalledWith('pytest -v --tb=short', '/proj');
  });

  it('runPytest calls pytest without flags when none provided', async () => {
    await p.runPytest('/proj');
    expect(mockExecute).toHaveBeenCalledWith('pytest ', '/proj');
  });

  it('formatBlack runs black .', async () => {
    await p.formatBlack('/proj');
    expect(mockExecute).toHaveBeenCalledWith('black .', '/proj');
  });

  it('lintRuff runs ruff check .', async () => {
    await p.lintRuff('/proj');
    expect(mockExecute).toHaveBeenCalledWith('ruff check .', '/proj');
  });

  it('typeCheckMypy runs mypy .', async () => {
    await p.typeCheckMypy('/proj');
    expect(mockExecute).toHaveBeenCalledWith('mypy .', '/proj');
  });

  it('isAvailable checks python --version', async () => {
    await p.isAvailable();
    expect(mockCheckTool).toHaveBeenCalledWith('python', 'python --version');
  });
});

// ── DockerProvider ────────────────────────────────────────────────────────────

describe('DockerProvider', () => {
  const p = new DockerProvider();

  it('build constructs docker build command', async () => {
    await p.build('my-image', 'Dockerfile', '/proj');
    expect(mockExecute).toHaveBeenCalledWith(
      'docker build -t my-image -f Dockerfile .',
      '/proj',
    );
  });

  it('run constructs docker run command without cwd', async () => {
    await p.run('my-container', 'my-image', '8080:80');
    expect(mockExecute).toHaveBeenCalledWith(
      'docker run --name my-container -p 8080:80 my-image',
    );
  });

  it('composeUp runs docker-compose up', async () => {
    await p.composeUp('/proj', false);
    expect(mockExecute).toHaveBeenCalledWith('docker-compose up', '/proj');
  });

  it('composeUp uses -d flag when detached=true', async () => {
    await p.composeUp('/proj', true);
    expect(mockExecute).toHaveBeenCalledWith('docker-compose up -d', '/proj');
  });

  it('composeDown runs docker-compose down', async () => {
    await p.composeDown('/proj');
    expect(mockExecute).toHaveBeenCalledWith('docker-compose down', '/proj');
  });

  it('isAvailable checks docker --version', async () => {
    await p.isAvailable();
    expect(mockCheckTool).toHaveBeenCalledWith('docker', 'docker --version');
  });

  it('isComposeAvailable checks docker-compose --version', async () => {
    await p.isComposeAvailable();
    expect(mockCheckTool).toHaveBeenCalledWith('docker-compose', 'docker-compose --version');
  });
});

// ── NxProvider ────────────────────────────────────────────────────────────────

describe('NxProvider', () => {
  const p = new NxProvider();

  it('generate builds npx nx generate command', async () => {
    await p.generate('my-lib', '@nx/nest:library', '/workspace');
    expect(mockExecute).toHaveBeenCalledWith(
      'npx nx generate @nx/nest:library my-lib',
      '/workspace',
    );
  });

  it('build runs npx nx build without target', async () => {
    await p.build('/workspace');
    expect(mockExecute).toHaveBeenCalledWith('npx nx build', '/workspace');
  });

  it('build includes target when specified', async () => {
    await p.build('/workspace', 'api');
    expect(mockExecute).toHaveBeenCalledWith('npx nx build api', '/workspace');
  });

  it('serve runs npx nx serve without target', async () => {
    await p.serve('/workspace');
    expect(mockExecute).toHaveBeenCalledWith('npx nx serve', '/workspace');
  });

  it('serve includes target when specified', async () => {
    await p.serve('/workspace', 'frontend');
    expect(mockExecute).toHaveBeenCalledWith('npx nx serve frontend', '/workspace');
  });

  it('affectedBuild runs npx nx affected:build', async () => {
    await p.affectedBuild('/workspace');
    expect(mockExecute).toHaveBeenCalledWith('npx nx affected:build', '/workspace');
  });

  it('isAvailable checks nx via npx nx --version', async () => {
    await p.isAvailable();
    expect(mockCheckTool).toHaveBeenCalledWith('nx', 'npx nx --version');
  });
});

// ── GitHubActionsProvider ─────────────────────────────────────────────────────

describe('GitHubActionsProvider', () => {
  const mockMkdir     = fsPromises.mkdir     as jest.Mock;
  const mockWriteFile = fsPromises.writeFile as jest.Mock;
  const p = new GitHubActionsProvider();

  it('creates workflows directory under .github/workflows', async () => {
    await p.createWorkflowFile('ci', 'content', '/repo');
    expect(mockMkdir).toHaveBeenCalledWith(
      path.join('/repo', '.github', 'workflows'),
      { recursive: true },
    );
  });

  it('writes workflow file with <name>.yml', async () => {
    await p.createWorkflowFile('ci', 'on: push\n', '/repo');
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join('/repo', '.github', 'workflows', 'ci.yml'),
      'on: push\n',
    );
  });

  it('handles custom workflow name in filename', async () => {
    await p.createWorkflowFile('release-drafter', 'content', '/repo');
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join('/repo', '.github', 'workflows', 'release-drafter.yml'),
      'content',
    );
  });
});
