import { getAgentTools } from "./agent";

const mockFileSystem = {
  exists: jest.fn(),
  readdirNames: jest.fn(),
  stat: jest.fn(),
  readJson: jest.fn(),
  writeJson: jest.fn(),
  ensureDir: jest.fn(),
  remove: jest.fn(),
  existsSync: jest.fn(),
};

const handleAgentTools = async (toolName: string, args: any, deps?: any) => {
  const tools = getAgentTools(mockFileSystem as any, {} as any);
  const tool = tools.find((t: any) => t.schema.name === toolName);
  if (!tool) throw new Error(`Unknown ${toolName} tool`);

  // Create deps object if mockDep is a service (from old code)
  // Check the old code, if it passed a mockService directly, we should map it to deps.service or deps.moscowService
  // Let's just pass deps directly, and if it's the mockService, we need to wrap it.

  let toolDeps = deps;
  if (
    deps &&
    !deps.moscowService &&
    !deps.validator &&
    toolName.includes("moscow")
  ) {
    toolDeps = { moscowService: deps };
  } else if (
    deps &&
    !deps.moscowService &&
    !deps.validator &&
    toolName.includes("validate")
  ) {
    toolDeps = { validator: deps };
  }

  return tool.execute(args, toolDeps);
};

describe("MCP Tools - agent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("evolith-agent-install", () => {
    it("should install agent with standard template by default", async () => {
      const result = await handleAgentTools("evolith-agent-install", {
        name: "test-agent",
        dir: "/test",
      });

      expect(mockFileSystem.ensureDir).toHaveBeenCalled();
      expect(mockFileSystem.writeJson).toHaveBeenCalled();
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("agent", "test-agent");
      expect(result).toHaveProperty("template", "standard");
    });

    it("should install agent with minimal template", async () => {
      const result = await handleAgentTools("evolith-agent-install", {
        name: "test-agent",
        template: "minimal",
        dir: "/test",
      });

      expect(result).toHaveProperty("template", "minimal");
    });

    it("should install agent with enterprise template", async () => {
      const result = await handleAgentTools("evolith-agent-install", {
        name: "test-agent",
        template: "enterprise",
        dir: "/test",
      });

      expect(result).toHaveProperty("template", "enterprise");
    });

    it("should use current directory when dir not provided", async () => {
      await handleAgentTools("evolith-agent-install", { name: "test-agent" });

      expect(mockFileSystem.ensureDir).toHaveBeenCalled();
    });
  });

  describe("evolith-agent-list", () => {
    it("should return empty list when no agents directory", async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await handleAgentTools("evolith-agent-list", {
        dir: "/test",
      });

      expect(result).toHaveProperty("agents");
      expect((result as any).agents).toEqual([]);
    });

    it("should return list of agents", async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(["agent-1", "agent-2"]);
      mockFileSystem.stat.mockResolvedValue({ isDirectory: () => true });
      mockFileSystem.readJson.mockResolvedValue({
        agent: { name: "agent-1", version: "1.0.0", template: "standard" },
      });

      const result = await handleAgentTools("evolith-agent-list", {
        dir: "/test",
      });

      expect((result as any).agents.length).toBeGreaterThan(0);
      expect(result).toHaveProperty("count");
    });

    it("should return default version when not in ruleset", async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(["agent-1"]);
      mockFileSystem.stat.mockResolvedValue({ isDirectory: () => true });
      mockFileSystem.readJson.mockResolvedValue({});

      const result = await handleAgentTools("evolith-agent-list", {
        dir: "/test",
      });

      expect((result as any).agents[0].version).toBe("1.0.0");
    });
  });

  describe("evolith-agent-validate", () => {
    it("should return invalid when agent not found", async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await handleAgentTools("evolith-agent-validate", {
        name: "test-agent",
        dir: "/test",
      });

      expect(result).toHaveProperty("valid", false);
      expect(result).toHaveProperty("error");
    });

    it("should validate agent ruleset structure", async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        agent: { name: "test-agent" },
        ruleset: { version: "1.0" },
        principles: [{ id: "P-01" }],
      });

      const result = await handleAgentTools("evolith-agent-validate", {
        name: "test-agent",
        dir: "/test",
      });

      expect(result).toHaveProperty("valid", true);
    });

    it("should detect missing agent name", async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        agent: {},
        ruleset: { version: "1.0" },
        principles: [{ id: "P-01" }],
      });

      const result = await handleAgentTools("evolith-agent-validate", {
        name: "test-agent",
        dir: "/test",
      });

      expect(
        (result as any).issues.some((i: any) => i.field === "agent.name"),
      ).toBe(true);
    });

    it("should detect missing ruleset version", async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        agent: { name: "test-agent" },
        ruleset: {},
        principles: [{ id: "P-01" }],
      });

      const result = await handleAgentTools("evolith-agent-validate", {
        name: "test-agent",
        dir: "/test",
      });

      expect(
        (result as any).issues.some((i: any) => i.field === "ruleset.version"),
      ).toBe(true);
    });

    it("should detect missing principles", async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        agent: { name: "test-agent" },
        ruleset: { version: "1.0" },
      });

      const result = await handleAgentTools("evolith-agent-validate", {
        name: "test-agent",
        dir: "/test",
      });

      expect(
        (result as any).issues.some((i: any) => i.field === "principles"),
      ).toBe(true);
    });
  });

  describe("evolith-agent-upgrade", () => {
    it("should throw error when agent not found", async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      await expect(
        handleAgentTools("evolith-agent-upgrade", {
          name: "test-agent",
          dir: "/test",
        }),
      ).rejects.toThrow("not found");
    });

    it("should increment patch version", async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        agent: { version: "1.0.0" },
      });

      const result = await handleAgentTools("evolith-agent-upgrade", {
        name: "test-agent",
        dir: "/test",
      });

      expect(result).toHaveProperty("fromVersion", "1.0.0");
      expect(result).toHaveProperty("toVersion", "1.0.1");
    });

    it("should default to 1.0.0 when version missing", async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({ agent: {} });

      const result = await handleAgentTools("evolith-agent-upgrade", {
        name: "test-agent",
        dir: "/test",
      });

      expect(result).toHaveProperty("fromVersion", "1.0.0");
      expect(result).toHaveProperty("toVersion", "1.0.1");
    });
  });

  describe("evolith-agent-remove", () => {
    it("should throw error when agent not found", async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      await expect(
        handleAgentTools("evolith-agent-remove", {
          name: "test-agent",
          dir: "/test",
        }),
      ).rejects.toThrow("not found");
    });

    it("should remove agent directory", async () => {
      mockFileSystem.exists.mockResolvedValue(true);

      const result = await handleAgentTools("evolith-agent-remove", {
        name: "test-agent",
        dir: "/test",
      });

      expect(mockFileSystem.remove).toHaveBeenCalled();
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("unknown tool", () => {
    it("should throw error for unknown agent tool", async () => {
      await expect(
        handleAgentTools("evolith-agent-unknown", {}),
      ).rejects.toThrow("Unknown evolith-agent-unknown tool");
    });
  });
});
