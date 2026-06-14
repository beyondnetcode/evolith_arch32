import { getMoscowTools } from "./moscow";

jest.mock("./tool-utils", () => ({
  getFileSystem: jest.fn(),
  getContainer: jest.fn(),
}));

import { getFileSystem } from "./tool-utils";

const mockFileSystem = {
  exists: jest.fn(),
  readFile: jest.fn(),
  readdirNames: jest.fn(),
  stat: jest.fn(),
  ensureDir: jest.fn(),
  writeJson: jest.fn(),
};

jest.mock("../../../infrastructure/adapters/moscow-prioritization.service", () => ({
  MoscowPrioritizationService: jest.fn().mockImplementation(() => ({
    createAnalysis: jest.fn(),
    loadAnalysis: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    listAnalyses: jest.fn(),
    validateAnalysis: jest.fn(),
    generateReport: jest.fn(),
  })),
}));

import { MoscowPrioritizationService } from "../../../infrastructure/adapters/moscow-prioritization.service";

const handleMoscowTools = async (toolName: string, args: unknown, deps?: unknown) => {
  const tools = getMoscowTools({} as unknown, {} as unknown);
  const tool = tools.find((t: unknown) => t.schema.name === toolName);
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

describe("MCP Tools - moscow", () => {
  let mockService: jest.Mocked<MoscowPrioritizationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    (getFileSystem as jest.Mock).mockReturnValue(mockFileSystem);
    mockService =
      new MoscowPrioritizationService() as jest.Mocked<MoscowPrioritizationService>;
  });

  describe("evolith-moscow-create", () => {
    it("should return error when path is missing", async () => {
      const result = await handleMoscowTools("evolith-moscow-create", {});

      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("message", "path is required");
    });

    it("should return error when items are missing", async () => {
      const result = await handleMoscowTools("evolith-moscow-create", {
        path: "/test/repo",
      });

      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("message", "items array is required");
    });

    it("should create analysis with items", async () => {
      const items = [
        {
          description: "Test item",
          priority: "MUST",
          category: "Test",
          rationale: "Testing",
          phase: "phase-0",
        },
      ];
      mockService.createAnalysis.mockResolvedValue({
        repository: "/test/repo",
        phase: "phase-0",
        items: [],
        summary: { must: 0, should: 0, could: 0, wont: 0, total: 0 },
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      });

      const result = await handleMoscowTools(
        "evolith-moscow-create",
        {
          path: "/test/repo",
          items,
        },
        mockService,
      );

      expect(mockService.createAnalysis).toHaveBeenCalledWith(
        "/test/repo",
        "phase-0",
        items,
      );
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("evolith-moscow-load", () => {
    it("should return error when path is missing", async () => {
      const result = await handleMoscowTools("evolith-moscow-load", {});

      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("message", "path is required");
    });

    it("should return error when analysis not found", async () => {
      mockService.loadAnalysis.mockResolvedValue(null);

      const result = await handleMoscowTools(
        "evolith-moscow-load",
        { path: "/test/repo" },
        mockService,
      );

      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("message");
    });

    it("should load analysis when found", async () => {
      const mockAnalysis = {
        repository: "/test/repo",
        phase: "phase-0",
        items: [],
        summary: { must: 0, should: 0, could: 0, wont: 0, total: 0 },
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      };
      mockService.loadAnalysis.mockResolvedValue(mockAnalysis);

      const result = await handleMoscowTools(
        "evolith-moscow-load",
        { path: "/test/repo" },
        mockService,
      );

      expect(result).toEqual(mockAnalysis);
    });
  });

  describe("evolith-moscow-update", () => {
    it("should return error when itemId is missing", async () => {
      const result = await handleMoscowTools("evolith-moscow-update", {
        path: "/test/repo",
      });

      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("message", "itemId is required");
    });

    it("should return error when item not found", async () => {
      mockService.updateItem.mockResolvedValue(null);

      const result = await handleMoscowTools(
        "evolith-moscow-update",
        {
          path: "/test/repo",
          itemId: "P-001",
          updates: { priority: "SHOULD" },
        },
        mockService,
      );

      expect(result).toHaveProperty("error", true);
    });

    it("should update item when found", async () => {
      mockService.updateItem.mockResolvedValue({
        repository: "/test/repo",
        phase: "phase-0",
        items: [],
        summary: { must: 0, should: 0, could: 0, wont: 0, total: 0 },
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      });

      const result = await handleMoscowTools(
        "evolith-moscow-update",
        {
          path: "/test/repo",
          itemId: "P-001",
          updates: { priority: "SHOULD" },
        },
        mockService,
      );

      expect(result).toHaveProperty("success", true);
    });
  });

  describe("evolith-moscow-remove", () => {
    it("should return error when itemId is missing", async () => {
      const result = await handleMoscowTools("evolith-moscow-remove", {
        path: "/test/repo",
      });

      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("message", "itemId is required");
    });

    it("should remove item when found", async () => {
      mockService.removeItem.mockResolvedValue({
        repository: "/test/repo",
        phase: "phase-0",
        items: [],
        summary: { must: 0, should: 0, could: 0, wont: 0, total: 0 },
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      });

      const result = await handleMoscowTools(
        "evolith-moscow-remove",
        {
          path: "/test/repo",
          itemId: "P-001",
        },
        mockService,
      );

      expect(result).toHaveProperty("success", true);
    });
  });

  describe("evolith-moscow-list", () => {
    it("should return error when path is missing", async () => {
      const result = await handleMoscowTools("evolith-moscow-list", {});

      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("message", "path is required");
    });

    it("should list analyses", async () => {
      mockService.listAnalyses.mockResolvedValue([
        {
          phase: "phase-0",
          path: "/test/.evolith/moscow/phase-0.json",
          updatedAt: "2026-01-01",
        },
      ]);

      const result = await handleMoscowTools(
        "evolith-moscow-list",
        { path: "/test/repo" },
        mockService,
      );

      expect(result).toHaveProperty("analyses");
      expect(result).toHaveProperty("count", 1);
    });
  });

  describe("evolith-moscow-validate", () => {
    it("should return error when path is missing", async () => {
      const result = await handleMoscowTools("evolith-moscow-validate", {});

      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("message", "path is required");
    });

    it("should validate analysis", async () => {
      mockService.loadAnalysis.mockResolvedValue({
        repository: "/test/repo",
        phase: "phase-0",
        items: [],
        summary: { must: 0, should: 0, could: 0, wont: 0, total: 0 },
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      });
      mockService.validateAnalysis.mockReturnValue({ valid: true, issues: [] });

      const result = await handleMoscowTools(
        "evolith-moscow-validate",
        { path: "/test/repo" },
        mockService,
      );

      expect(result).toHaveProperty("valid", true);
    });
  });

  describe("evolith-moscow-report", () => {
    it("should return error when path is missing", async () => {
      const result = await handleMoscowTools("evolith-moscow-report", {});

      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("message", "path is required");
    });

    it("should generate report", async () => {
      mockService.loadAnalysis.mockResolvedValue({
        repository: "/test/repo",
        phase: "phase-0",
        items: [],
        summary: { must: 0, should: 0, could: 0, wont: 0, total: 0 },
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      });
      mockService.generateReport.mockReturnValue("# Report");

      const result = await handleMoscowTools(
        "evolith-moscow-report",
        { path: "/test/repo" },
        mockService,
      );

      expect(result).toHaveProperty("report", "# Report");
    });
  });

  describe("unknown tool", () => {
    it("should throw error for unknown MoSCoW tool", async () => {
      await expect(
        handleMoscowTools("evolith-moscow-unknown", { path: "/test/repo" }),
      ).rejects.toThrow("Unknown evolith-moscow-unknown tool");
    });
  });
});
