import { CommandBuilder, CommandWatcher } from './command-watcher';
import { commandExecutor } from '../../infrastructure/cli/command-executor';

jest.mock('../../infrastructure/cli/command-executor', () => ({
  commandExecutor: {
    checkTool: jest.fn(),
    execute: jest.fn(),
  },
}));

const mockedExecutor = commandExecutor as jest.Mocked<typeof commandExecutor>;

describe('CommandWatcher', () => {
  let watcher: CommandWatcher;

  beforeEach(() => {
    jest.clearAllMocks();
    watcher = new CommandWatcher();
    mockedExecutor.checkTool.mockResolvedValue({
      name: 'node',
      available: true,
      version: 'v1',
    });
  });

  it('records successful command traces with platform checks', async () => {
    mockedExecutor.execute.mockResolvedValue({
      command: 'node --version',
      exitCode: 0,
      success: true,
      stdout: 'v1',
      stderr: '',
    });

    const trace = await watcher.executeWithTrace('node --version', '/repo', {
      name: 'node',
      command: 'node --version',
    });

    expect(trace.success).toBe(true);
    expect(trace.platformCheck?.available).toBe(true);
    expect(watcher.getLastTrace()).toEqual(trace);
    expect(watcher.getSuccessfulTraces()).toHaveLength(1);
    expect(watcher.getFailedTraces()).toHaveLength(0);
  });

  it('records failed command traces and clears history', async () => {
    mockedExecutor.execute.mockResolvedValue({
      command: 'bad',
      exitCode: 1,
      success: false,
      stdout: '',
      stderr: 'failed',
    });

    const trace = await watcher.executeWithTrace('bad');

    expect(trace.success).toBe(false);
    expect(watcher.getFailedTraces()).toHaveLength(1);
    watcher.clearTraces();
    expect(watcher.getTraces()).toEqual([]);
  });

  it('records exception traces and rethrows', async () => {
    mockedExecutor.execute.mockRejectedValue(new Error('boom'));

    await expect(watcher.executeWithTrace('explode')).rejects.toThrow('boom');
    expect(watcher.getLastTrace()?.success).toBe(false);
    expect(watcher.getLastTrace()?.stderr).toBe('boom');
  });

  it('reports unavailable platform checks', async () => {
    mockedExecutor.checkTool.mockResolvedValue({
      name: 'gh',
      available: false,
      installHint: 'install gh',
    });
    mockedExecutor.execute.mockResolvedValue({
      command: 'gh --version',
      exitCode: 0,
      success: true,
      stdout: '',
      stderr: '',
    });

    const trace = await watcher.executeWithTrace('gh --version', undefined, {
      name: 'gh',
      command: 'gh --version',
    });

    expect(trace.platformCheck).toEqual({
      name: 'gh',
      available: false,
      version: undefined,
    });
    await expect(watcher.checkPlatformAndReport('gh', 'gh --version')).resolves.toBe(false);
  });

  it('prints summaries for successful and failed traces', async () => {
    mockedExecutor.execute
      .mockResolvedValueOnce({ command: 'ok', exitCode: 0, success: true, stdout: '', stderr: '' })
      .mockResolvedValueOnce({ command: 'bad', exitCode: 2, success: false, stdout: '', stderr: 'nope' });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await watcher.executeWithTrace('ok');
    await watcher.executeWithTrace('bad');
    watcher.printSummary();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[CMD-'));
    logSpy.mockRestore();
  });
});

describe('CommandBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds commands fluently and executes them with a fresh watcher', async () => {
    mockedExecutor.execute.mockResolvedValue({
      command: 'npm test -- --runInBand',
      exitCode: 0,
      success: true,
      stdout: 'ok',
      stderr: '',
    });

    const builder = new CommandBuilder('npm')
      .append('test')
      .append('--')
      .append('--runInBand')
      .withCwd('/repo')
      .disableTrace();

    expect(builder.build()).toBe('npm test -- --runInBand');
    await expect(builder.execute()).resolves.toMatchObject({
      command: 'npm test -- --runInBand',
      cwd: '/repo',
      success: true,
    });
  });
});
