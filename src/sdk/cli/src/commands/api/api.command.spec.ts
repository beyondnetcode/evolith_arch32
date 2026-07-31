import { ApiCommand } from './api.command';
import { TOOLS, TOOL_SCHEMAS } from './api.catalog';

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
    /**
     * GT-583 — these cases used to name `gate-evaluate`, `validate-artifacts`
     * and `agent-create` and assert only `resolves.not.toThrow()`. Not one of
     * those keys is a tool name (`evolith-gate-evaluate` is), and
     * `agent-create` has never existed at all — so all three were passing
     * against the "unknown operation" branch. A schema assertion that passes
     * when the schema is absent is why a three-entry catalog described a
     * fifty-tool surface for as long as it did.
     */
    it('EVERY advertised MCP tool has a schema to inspect', () => {
      const withoutSchema = TOOLS.filter((t) => !TOOL_SCHEMAS[t.name]).map((t) => t.name);
      expect(withoutSchema).toEqual([]);
      expect(TOOLS.length).toBeGreaterThanOrEqual(40);
    });

    it('every schema carries both an input and an output contract', () => {
      const incomplete = Object.entries(TOOL_SCHEMAS)
        .filter(([, s]) => !s.inputSchema || !s.outputSchema || !s.description)
        .map(([name]) => name);
      expect(incomplete).toEqual([]);
    });

    it('should inspect a real tool schema under its canonical name', async () => {
      expect(TOOL_SCHEMAS['evolith-gate-evaluate']).toBeDefined();
      await expect(
        command.executeCommand([], { inspect: 'evolith-gate-evaluate' }),
      ).resolves.not.toThrow();
    });

    it('does NOT resolve the pre-GT-583 aliases, which named no tool', () => {
      expect(TOOL_SCHEMAS['gate-evaluate']).toBeUndefined();
      expect(TOOL_SCHEMAS['agent-create']).toBeUndefined();
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
      // GT-583 — canonical tool name. `gate-evaluate` was a key of the deleted
      // hand-written map and names no MCP tool.
      await command.executeCommand([], { inspect: 'evolith-gate-evaluate', format: 'json' } as never);
      const e = env();
      expect(e.success).toBe(true);
      expect(e.data.type).toBe('tool');
      expect(e.data.inputSchema).toBeDefined();
      expect(e.data.outputSchema).toBeDefined();
      expect(e.data.inputSchema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
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
