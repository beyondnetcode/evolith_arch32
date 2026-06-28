import { CommandResult, CommandExecutor } from './command-executor';

describe('CommandResult', () => {
  describe('ok', () => {
    it('should create successful result', () => {
      const result = CommandResult.ok('output');
      expect(result.success).toBe(true);
      expect(result.stdout).toBe('output');
      expect(result.stderr).toBe('');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('err', () => {
    it('should create error result', () => {
      const result = CommandResult.err('error message', 1);
      expect(result.success).toBe(false);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('error message');
      expect(result.exitCode).toBe(1);
    });

    it('should handle different exit codes', () => {
      const result = CommandResult.err('failed', 127);
      expect(result.exitCode).toBe(127);
    });
  });
});

describe('CommandExecutor', () => {
  let executor: CommandExecutor;

  beforeEach(() => {
    executor = new CommandExecutor();
  });

  afterEach(() => {
    executor.clearCache();
  });

  describe('execute', () => {
    it('should execute simple echo command', async () => {
      const result = await executor.execute('echo "hello"');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('hello');
    });

    it('should return error for invalid command', async () => {
      const result = await executor.execute('nonexistent-command-xyz');
      expect(result.success).toBe(false);
      expect(result.exitCode).toBeGreaterThan(0);
    });

    it('should handle command with working directory', async () => {
      const result = await executor.execute('pwd', process.cwd());
      expect(result.success).toBe(true);
    });
  });

  describe('checkTool', () => {
    it('should return available true for node', async () => {
      const check = await executor.checkTool('node', 'node --version');
      expect(check.name).toBe('node');
      expect(check.available).toBe(true);
    });

    it('should return available true for npm', async () => {
      const check = await executor.checkTool('npm', 'npm --version');
      expect(check.name).toBe('npm');
      expect(check.available).toBe(true);
      expect(check.version).toBeDefined();
    });

    it('should return available false for nonexistent tool', async () => {
      const check = await executor.checkTool('nonexistent-tool-xyz', 'nonexistent-tool-xyz --version');
      expect(check.name).toBe('nonexistent-tool-xyz');
      expect(check.available).toBe(false);
      expect(check.installHint).toBeDefined();
    });

    it('should cache tool check results', async () => {
      const firstCheck = await executor.checkTool('node', 'node --version');
      const secondCheck = await executor.checkTool('node', 'node --version');

      expect(firstCheck.available).toBe(secondCheck.available);
    });

    it('should parse version from output', async () => {
      const check = await executor.checkTool('node', 'node --version');
      expect(check.version).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('executeOrThrow', () => {
    it('should return stdout for successful command', async () => {
      const stdout = await executor.executeOrThrow('echo "test"');
      expect(stdout).toContain('test');
    });

    it('should throw CommandExecutionError for failed command', async () => {
      await expect(executor.executeOrThrow('exit 1')).rejects.toThrow();
    });
  });

  describe('clearCache', () => {
    it('should clear cached tool checks', async () => {
      await executor.checkTool('node', 'node --version');
      executor.clearCache();

      // After clearing cache, checkTool should re-execute
      const check = await executor.checkTool('node', 'node --version');
      expect(check.version).toBeDefined();
    });
  });

  describe('executeFile (GT-346: shell-free)', () => {
    it('runs a binary with an args array', async () => {
      const result = await executor.executeFile('node', ['-e', 'process.stdout.write("hi")']);
      expect(result.success).toBe(true);
      expect(result.stdout).toBe('hi');
    });

    it('treats shell metacharacters in args as literal data (no injection)', async () => {
      // Under a shell, `; echo HACKED` would run a second command. With execFile
      // it is just an extra literal argv entry to node, never executed.
      const result = await executor.executeFile('node', ['-e', 'process.stdout.write("safe")', '; echo HACKED']);
      expect(result.success).toBe(true);
      expect(result.stdout).toBe('safe');
      expect(result.stdout).not.toContain('HACKED');
    });

    it('returns an error result for a nonexistent binary', async () => {
      const result = await executor.executeFile('nonexistent-binary-xyz', ['--version']);
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
    });
  });
});