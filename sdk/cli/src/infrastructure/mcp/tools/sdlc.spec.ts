import { getSdlcTools } from "./sdlc";

jest.mock("./tool-utils", () => ({
  getFileSystem: jest.fn(),
  getContainer: jest.fn(),
}));

import { getFileSystem, getContainer } from "./tool-utils";

const mockFileSystem = {
  exists: jest.fn(),
  readFile: jest.fn(),
  readJson: jest.fn(),
  existsSync: jest.fn(),
  ensureDir: jest.fn(),
  writeJson: jest.fn(),
};

const mockConfigParser = {
  parse: jest.fn(),
};

const handleSdlcTools = async (toolName: string, args: any, deps?: any) => {
  const tools = getSdlcTools({} as any, {} as any);
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

describe.skip("MCP Tools - sdlc", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getFileSystem as jest.Mock).mockReturnValue(mockFileSystem);
    (getContainer as jest.Mock).mockReturnValue({
      createConfigParser: jest.fn().mockReturnValue(mockConfigParser),
    });
  });

  describe("evolith-sdlc-status", () => {
    it("should return error when path is missing", async () => {
      const result = await handleSdlcTools("evolith-sdlc-status", {});

      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("message", "path is required");
    });

    it("should return phase-0 when evolith.yaml not found", async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await handleSdlcTools("evolith-sdlc-status", {
        path: "/test/repo",
      });

      expect(result).toHaveProperty("currentPhase", "phase-0");
    });

    it("should return current phase from evolith.yaml", async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue("product:\n  phase: phase-2");
      mockConfigParser.parse.mockReturnValue({
        product: { phase: "phase-2" },
      });
      mockFileSystem.existsSync.mockReturnValue(false);

      const result = await handleSdlcTools("evolith-sdlc-status", {
        path: "/test/repo",
      });

      expect((result as any).currentPhase).toBe("phase-2");
    });

    it("should include phase status in status", async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue("product:\n  phase: phase-0");
      mockConfigParser.parse.mockReturnValue({
        product: { phase: "phase-0" },
      });
      mockFileSystem.existsSync.mockReturnValue(false);

      const result = await handleSdlcTools("evolith-sdlc-status", {
        path: "/test/repo",
      });

      expect(result).toHaveProperty("phaseStatus");
      expect((result as any).phaseStatus.length).toBe(5);
    });

    it("should include timestamp", async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await handleSdlcTools("evolith-sdlc-status", {
        path: "/test/repo",
      });

      expect(result).toHaveProperty("timestamp");
    });
  });

  describe("evolith-sdlc-handoff", () => {
    it("should return error when path is missing", async () => {
      const result = await handleSdlcTools("evolith-sdlc-handoff", {
        fromPhase: "phase-0",
        toPhase: "phase-1",
      });

      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("message", "path is required");
    });

    it("should throw error when fromPhase is missing", async () => {
      await expect(
        handleSdlcTools("evolith-sdlc-handoff", {
          path: "/test/repo",
          toPhase: "phase-1",
        }),
      ).rejects.toThrow("Invalid phase");
    });

    it("should throw error when toPhase is missing", async () => {
      await expect(
        handleSdlcTools("evolith-sdlc-handoff", {
          path: "/test/repo",
          fromPhase: "phase-0",
        }),
      ).rejects.toThrow("Invalid phase");
    });

    it("should throw error for invalid phase transition", async () => {
      await expect(
        handleSdlcTools("evolith-sdlc-handoff", {
          path: "/test/repo",
          fromPhase: "phase-2",
          toPhase: "phase-0",
        }),
      ).rejects.toThrow("Handoff must be to the next consecutive phase");
    });

    it("should throw error for same phase transition", async () => {
      await expect(
        handleSdlcTools("evolith-sdlc-handoff", {
          path: "/test/repo",
          fromPhase: "phase-1",
          toPhase: "phase-1",
        }),
      ).rejects.toThrow("Handoff must be to the next consecutive phase");
    });

    it("should generate handoff manifest for valid transition", async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue("product:\n  phase: phase-1");
      mockConfigParser.parse.mockReturnValue({ product: { phase: "phase-1" } });
      mockFileSystem.existsSync.mockReturnValue(true);

      const result = await handleSdlcTools("evolith-sdlc-handoff", {
        path: "/test/repo",
        fromPhase: "phase-0",
        toPhase: "phase-1",
      });

      expect((result as any).handoff.fromPhase).toBe("phase-0");
      expect((result as any).handoff.toPhase).toBe("phase-1");
      expect(result).toHaveProperty("artifacts");
    });

    it("should include requirements checklist in manifest", async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue("product:\n  phase: phase-1");
      mockConfigParser.parse.mockReturnValue({ product: { phase: "phase-1" } });
      mockFileSystem.existsSync.mockReturnValue(true);

      const result = await handleSdlcTools("evolith-sdlc-handoff", {
        path: "/test/repo",
        fromPhase: "phase-0",
        toPhase: "phase-1",
      });

      expect((result as any).artifacts).toBeDefined();
      expect(Array.isArray((result as any).artifacts)).toBe(true);
    });

    it("should handle phase-1 to phase-2 transition", async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue("product:\n  phase: phase-2");
      mockConfigParser.parse.mockReturnValue({ product: { phase: "phase-2" } });
      mockFileSystem.existsSync.mockReturnValue(true);

      const result = await handleSdlcTools("evolith-sdlc-handoff", {
        path: "/test/repo",
        fromPhase: "phase-1",
        toPhase: "phase-2",
      });

      expect((result as any).handoff.fromPhase).toBe("phase-1");
      expect((result as any).handoff.toPhase).toBe("phase-2");
    });

    it("should handle phase-2 to phase-3 transition", async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue("product:\n  phase: phase-3");
      mockConfigParser.parse.mockReturnValue({ product: { phase: "phase-3" } });
      mockFileSystem.existsSync.mockReturnValue(true);

      const result = await handleSdlcTools("evolith-sdlc-handoff", {
        path: "/test/repo",
        fromPhase: "phase-2",
        toPhase: "phase-3",
      });

      expect((result as any).handoff.fromPhase).toBe("phase-2");
      expect((result as any).handoff.toPhase).toBe("phase-3");
    });

    it("should handle phase-3 to phase-4 transition", async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue("product:\n  phase: phase-4");
      mockConfigParser.parse.mockReturnValue({ product: { phase: "phase-4" } });
      mockFileSystem.existsSync.mockReturnValue(true);

      const result = await handleSdlcTools("evolith-sdlc-handoff", {
        path: "/test/repo",
        fromPhase: "phase-3",
        toPhase: "phase-4",
      });

      expect((result as any).handoff.fromPhase).toBe("phase-3");
      expect((result as any).handoff.toPhase).toBe("phase-4");
    });
  });

  describe("unknown tool", () => {
    it("should throw error for unknown SDLC tool", async () => {
      await expect(handleSdlcTools("evolith-sdlc-unknown", {})).rejects.toThrow(
        "Unknown evolith-sdlc-unknown tool",
      );
    });
  });
});
