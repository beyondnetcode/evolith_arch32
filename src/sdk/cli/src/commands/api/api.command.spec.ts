import { ApiCommand } from './api.command';

describe('ApiCommand', () => {
  let command: ApiCommand;

  beforeEach(() => {
    command = new ApiCommand();
  });

  describe('constructor', () => {
    it('should create ApiCommand instance', () => {
      expect(command).toBeInstanceOf(ApiCommand);
    });
  });

  describe('--list flag', () => {
    it('should list all categories when --list is provided', async () => {
      await expect(command.executeCommand([], { list: true })).resolves.not.toThrow();
    });

    it('should list tools when --list --category tools is provided', async () => {
      await expect(command.executeCommand([], { list: true, category: 'tools' })).resolves.not.toThrow();
    });

    it('should list resources when --list --category resources is provided', async () => {
      await expect(command.executeCommand([], { list: true, category: 'resources' })).resolves.not.toThrow();
    });

    it('should list schemas when --list --category schemas is provided', async () => {
      await expect(command.executeCommand([], { list: true, category: 'schemas' })).resolves.not.toThrow();
    });

    it('should list commands when --list --category commands is provided', async () => {
      await expect(command.executeCommand([], { list: true, category: 'commands' })).resolves.not.toThrow();
    });

    it('should show error for unknown category', async () => {
      await expect(command.executeCommand([], { list: true, category: 'unknown' })).resolves.not.toThrow();
    });
  });

  describe('--inspect flag', () => {
    it('should inspect gate-evaluate tool schema', async () => {
      await expect(command.executeCommand([], { inspect: 'gate-evaluate' })).resolves.not.toThrow();
    });

    it('should inspect validate-artifacts tool schema', async () => {
      await expect(command.executeCommand([], { inspect: 'validate-artifacts' })).resolves.not.toThrow();
    });

    it('should inspect agent-create tool schema', async () => {
      await expect(command.executeCommand([], { inspect: 'agent-create' })).resolves.not.toThrow();
    });

    it('should inspect resource schema', async () => {
      await expect(command.executeCommand([], { inspect: 'evolith://rulesets' })).resolves.not.toThrow();
    });

    it('should inspect command schema', async () => {
      await expect(command.executeCommand([], { inspect: 'init' })).resolves.not.toThrow();
    });

    it('should show error for unknown operation', async () => {
      await expect(command.executeCommand([], { inspect: 'unknown-operation' })).resolves.not.toThrow();
    });
  });

  describe('parseOptions', () => {
    it('should parse --list flag', () => {
      const result = command.parseList();
      expect(result).toBe(true);
    });

    it('should parse --inspect <value> flag', () => {
      const result = command.parseInspect('gate-evaluate');
      expect(result).toBe('gate-evaluate');
    });

    it('should parse --category <value> flag', () => {
      const result = command.parseCategory('tools');
      expect(result).toBe('tools');
    });
  });

  // `--format json` es como un agente descubre la superficie del CLI, y estaba
  // sin cubrir: tanto el listado por categoria como el inspect de cada tipo
  // (tool / resource / command) y sus caminos de error.
  describe('--format json', () => {
    let logSpy: jest.SpyInstance;

    const env = () => {
      const printed = logSpy.mock.calls
        .map((c: unknown[]) => String(c[0]))
        .filter((s: string) => s.trim().startsWith('{'));
      expect(printed.length).toBeGreaterThan(0);
      return JSON.parse(printed[printed.length - 1]);
    };

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      process.exitCode = undefined;
    });

    afterEach(() => {
      logSpy.mockRestore();
      process.exitCode = undefined;
    });

    it('--list sin categoria devuelve el indice de categorias', async () => {
      await command.executeCommand([], { list: true, format: 'json' } as never);
      const e = env();
      expect(e.success).toBe(true);
      expect(e.data.categories.map((c: { name: string }) => c.name)).toEqual(
        expect.arrayContaining(['tools', 'resources', 'schemas', 'commands']),
      );
    });

    it('--list con una categoria valida devuelve su contenido', async () => {
      await command.executeCommand([], { list: true, category: 'tools', format: 'json' } as never);
      expect(env().success).toBe(true);
    });

    it('--list con categoria desconocida falla nombrandola, con exit 1', async () => {
      await command.executeCommand([], { list: true, category: 'inventada', format: 'json' } as never);
      const e = env();
      expect(e.success).toBe(false);
      expect(e.error.message).toMatch(/Unknown category: inventada/);
      expect(process.exitCode).toBe(1);
    });

    it('--inspect de un tool devuelve su schema de entrada y salida', async () => {
      await command.executeCommand([], { inspect: 'gate-evaluate', format: 'json' } as never);
      const e = env();
      expect(e.success).toBe(true);
      expect(e.data.type).toBe('tool');
      expect(e.data.inputSchema).toBeDefined();
    });

    it('--inspect de un resource devuelve su mimeType', async () => {
      await command.executeCommand([], { inspect: 'evolith://rulesets', format: 'json' } as never);
      const e = env();
      expect(e.data.type).toBe('resource');
      expect(e.data.mimeType).toBe('application/json');
    });

    it('--inspect de un comando lo identifica como tal', async () => {
      await command.executeCommand([], { inspect: 'init', format: 'json' } as never);
      expect(env().data.type).toBe('command');
    });

    it('--inspect de algo inexistente falla en vez de devolver vacio', async () => {
      await command.executeCommand([], { inspect: 'no-existe-nada', format: 'json' } as never);
      const e = env();
      expect(e.success).toBe(false);
    });
  });
});
