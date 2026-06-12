import { HandoffCommand } from "./handoff.command";
import * as p from "@clack/prompts";
import { CatalogLoader } from "../../infrastructure/catalog/catalog-loader";

jest.mock("@clack/prompts");
jest.mock("../../infrastructure/catalog/catalog-loader", () => {
  return {
    CatalogLoader: jest.fn().mockImplementation(() => ({
      loadToolCatalog: jest.fn(),
      loadRuntimeCatalog: jest.fn(),
      getMonorepoOptions: jest.fn(),
      getArchitecturePatterns: jest.fn(),
      getDefaultDatabase: jest.fn(),
      getApiProtocols: jest.fn(),
      loadCommandsMatrix: jest.fn(),
      reload: jest.fn(),
    })),
  };
});
jest.mock("../../application/services", () => {
  return {
    PhaseTransitionUseCase: jest.fn().mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue({
        success: true,
        from: "phase-1",
        to: "phase-2",
        gateResults: [],
        executedTools: [],
        warnings: [],
        errors: [],
      }),
    })),
  };
});

const mockSelect = p.select as jest.Mock;
const mockConfirm = p.confirm as jest.Mock;
const mockMultiselect = p.multiselect as jest.Mock;
const mockSpinner = p.spinner as jest.Mock;
const mockIntro = p.intro as jest.Mock;
const mockOutro = p.outro as jest.Mock;
const mockGroup = p.group as jest.Mock;
const mockNote = p.note as jest.Mock;
const mockCancel = p.cancel as jest.Mock;
const mockLog = p.log as jest.Mocked<any>;

const mockSpinnerInstance = {
  start: jest.fn(),
  stop: jest.fn(),
};

const mockFs = {
  exists: jest.fn(),
  existsSync: jest.fn().mockReturnValue(false),
  readJson: jest.fn(),
  writeJson: jest.fn(),
  ensureDir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
};

const mockContainer = {
  createFileSystem: jest.fn().mockReturnValue(mockFs),
  createLogger: jest
    .fn()
    .mockReturnValue({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }),
};

const mockToolCatalog = {
  phases: {
    "phase-1": {
      toolGroups: {
        linting: {
          question: "Select linting tool",
          defaultOption: "eslint",
          options: [{ value: "eslint", label: "ESLint" }],
          tools: ["eslint"],
        },
      },
    },
    "phase-2": {
      toolGroups: {
        governance: {
          question: "Select governance tool",
          defaultOption: "adr",
          options: [{ value: "adr", label: "ADR" }],
          tools: ["adr"],
        },
      },
    },
  },
  toolMetadata: {},
};

const mockExecute = jest.fn().mockResolvedValue({
  success: true,
  from: "phase-1",
  to: "phase-2",
  gateResults: [],
  executedTools: [],
  warnings: [],
  errors: [],
});

const { PhaseTransitionUseCase } = require("../../application/services");

describe("HandoffCommand", () => {
  let command: HandoffCommand;
  let catalogLoader: jest.Mocked<CatalogLoader>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    catalogLoader = new CatalogLoader() as jest.Mocked<CatalogLoader>;
    (catalogLoader.loadToolCatalog as jest.Mock).mockReturnValue(
      mockToolCatalog,
    );

    mockSpinner.mockReturnValue(mockSpinnerInstance);
    mockExecute.mockResolvedValue({
      success: true,
      from: "phase-1",
      to: "phase-2",
      gateResults: [],
      executedTools: [],
      warnings: [],
      errors: [],
    });
    PhaseTransitionUseCase.mockImplementation(() => ({
      execute: mockExecute,
    }));
    command = new HandoffCommand(catalogLoader);
  });

  describe("run - non-interactive mode", () => {
    it("should execute handoff with from and to options", async () => {
      await command.run([], { from: "phase-1", to: "phase-2" });

      
      expect(mockExecute).toHaveBeenCalledWith(
        "phase-1",
        "phase-2",
        [],
        expect.any(String),
      );
    });

    it("should reject a failed transition", async () => {
      mockExecute.mockResolvedValueOnce({
        success: false,
        from: "phase-5",
        to: "phase-1",
        gateResults: [],
        executedTools: [],
        warnings: [],
        errors: ["Invalid transition"],
      });
      await expect(
        command.run([], { from: "phase-5", to: "phase-1" }),
      ).rejects.toThrow("Transition failed: Invalid transition");
    });

    it("should pass tools array to use case when provided", async () => {
      await command.run([], { from: "phase-1", to: "phase-2" });

      expect(mockExecute).toHaveBeenCalledWith(
        "phase-1",
        "phase-2",
        [],
        expect.any(String),
      );
    });
  });

  describe("run - interactive mode", () => {
    it("should run interactive handoff flow", async () => {
      mockGroup.mockImplementation(async (callbacks: any) => {
        const results: Record<string, any> = {};
        results.fromPhase = await callbacks.fromPhase();
        results.toPhase = await callbacks.toPhase({ results });
        results.validateGates = await callbacks.validateGates();
        results.uploadEvidence = await callbacks.uploadEvidence();
        results.selectTools = await callbacks.selectTools();
        results.tools = await callbacks.tools({ results });
        results.forceHandoff = await callbacks.forceHandoff();
        return results;
      });

      mockSelect
        .mockResolvedValueOnce("phase-1")
        .mockResolvedValueOnce("phase-2");
      mockConfirm
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockMultiselect.mockResolvedValue(["eslint"]);

      await command.run([], {});

      expect(mockIntro).toHaveBeenCalled();
      expect(mockSelect).toHaveBeenCalled();
      expect(mockConfirm).toHaveBeenCalled();
      expect(mockSpinnerInstance.start).toHaveBeenCalled();
      expect(mockSpinnerInstance.stop).toHaveBeenCalled();
    });

    it("should display completion message on success", async () => {
      mockGroup.mockImplementation(async (callbacks: any) => {
        const results: Record<string, any> = {};
        results.fromPhase = await callbacks.fromPhase();
        results.toPhase = await callbacks.toPhase({ results });
        results.validateGates = await callbacks.validateGates();
        results.uploadEvidence = await callbacks.uploadEvidence();
        results.selectTools = await callbacks.selectTools();
        results.tools = await callbacks.tools({ results });
        results.forceHandoff = await callbacks.forceHandoff();
        return results;
      });

      mockSelect
        .mockResolvedValueOnce("phase-0")
        .mockResolvedValueOnce("phase-1");
      mockConfirm
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      await command.run([], {});

      expect(mockOutro).toHaveBeenCalledWith(
        expect.stringContaining("Completed"),
      );
    });

    it("should handle handoff failure", async () => {
      mockExecute.mockResolvedValueOnce({
        success: false,
        from: "phase-5",
        to: "",
        gateResults: [
          { id: "G1", passed: false, description: "Failed", required: true },
        ],
        executedTools: [],
        warnings: [],
        errors: ["Transition failed"],
      });

      mockGroup.mockImplementation(async (callbacks: any) => {
        const results: Record<string, any> = {};
        results.fromPhase = await callbacks.fromPhase();
        results.toPhase = await callbacks.toPhase({ results });
        results.validateGates = await callbacks.validateGates();
        results.uploadEvidence = await callbacks.uploadEvidence();
        results.selectTools = await callbacks.selectTools();
        results.tools = await callbacks.tools({ results });
        results.forceHandoff = await callbacks.forceHandoff();
        return results;
      });

      mockSelect.mockResolvedValueOnce("phase-5").mockResolvedValueOnce("");
      mockConfirm
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      await command.run([], {});

      expect(mockOutro).toHaveBeenCalledWith(expect.stringContaining("Failed"));
    });

    it("should skip tool selection when selectTools is false", async () => {
      mockGroup.mockImplementation(async (callbacks: any) => {
        const results: Record<string, any> = {};
        results.fromPhase = await callbacks.fromPhase();
        results.toPhase = await callbacks.toPhase({ results });
        results.validateGates = await callbacks.validateGates();
        results.uploadEvidence = await callbacks.uploadEvidence();
        results.selectTools = await callbacks.selectTools();
        results.tools = await callbacks.tools({ results });
        results.forceHandoff = await callbacks.forceHandoff();
        return results;
      });

      mockSelect
        .mockResolvedValueOnce("phase-1")
        .mockResolvedValueOnce("phase-2");
      mockConfirm
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      await command.run([], {});

      expect(mockMultiselect).not.toHaveBeenCalled();
    });

    it("should show next steps on successful handoff", async () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      mockGroup.mockImplementation(async (callbacks: any) => {
        const results: Record<string, any> = {};
        results.fromPhase = await callbacks.fromPhase();
        results.toPhase = await callbacks.toPhase({ results });
        results.validateGates = await callbacks.validateGates();
        results.uploadEvidence = await callbacks.uploadEvidence();
        results.selectTools = await callbacks.selectTools();
        results.tools = await callbacks.tools({ results });
        results.forceHandoff = await callbacks.forceHandoff();
        return results;
      });

      mockSelect
        .mockResolvedValueOnce("phase-1")
        .mockResolvedValueOnce("phase-2");
      mockConfirm
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Next Steps"),
      );
      logSpy.mockRestore();
    });

    it("should display gate validation results when present", async () => {
      mockExecute.mockResolvedValueOnce({
        success: true,
        from: "phase-0",
        to: "phase-1",
        gateResults: [
          {
            id: "PG1-01",
            passed: true,
            description: "package.json exists",
            required: true,
          },
          {
            id: "PG1-02",
            passed: false,
            description: "src/ exists",
            required: false,
          },
        ],
        executedTools: ["eslint"],
        warnings: [],
        errors: [],
      });

      mockGroup.mockImplementation(async (callbacks: any) => {
        const results: Record<string, any> = {};
        results.fromPhase = await callbacks.fromPhase();
        results.toPhase = await callbacks.toPhase({ results });
        results.validateGates = await callbacks.validateGates();
        results.uploadEvidence = await callbacks.uploadEvidence();
        results.selectTools = await callbacks.selectTools();
        results.tools = await callbacks.tools({ results });
        results.forceHandoff = await callbacks.forceHandoff();
        return results;
      });

      mockSelect
        .mockResolvedValueOnce("phase-0")
        .mockResolvedValueOnce("phase-1");
      mockConfirm
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      await command.run([], {});

      expect(mockOutro).toHaveBeenCalledWith(
        expect.stringContaining("Completed"),
      );
    });
  });

  describe("getToolGroupsForPhase", () => {
    it("should return tool groups for valid phase", () => {
      const command_any = command as any;
      const result = command_any.getToolGroupsForPhase("phase-1");

      expect(result).toHaveProperty("linting");
    });

    it("should return empty object for invalid phase", () => {
      const command_any = command as any;
      const result = command_any.getToolGroupsForPhase("invalid-phase");

      expect(result).toEqual({});
    });
  });

  describe("getNextSteps", () => {
    it("should return next steps for phase-1", () => {
      const command_any = command as any;
      const result = command_any.getNextSteps("phase-1");

      expect(result).toContain("evolith validate");
    });

    it("should return next steps for phase-2", () => {
      const command_any = command as any;
      const result = command_any.getNextSteps("phase-2");

      expect(result).toContain("rulesets");
    });

    it("should return next steps for phase-3", () => {
      const command_any = command as any;
      const result = command_any.getNextSteps("phase-3");

      expect(result).toContain("ADRs");
    });

    it("should return next steps for phase-4", () => {
      const command_any = command as any;
      const result = command_any.getNextSteps("phase-4");

      expect(result).toContain("CI/CD");
    });

    it("should return next steps for phase-5", () => {
      const command_any = command as any;
      const result = command_any.getNextSteps("phase-5");

      expect(result).toContain("DORA");
    });

    it("should return empty string for unknown phase", () => {
      const command_any = command as any;
      const result = command_any.getNextSteps("unknown");

      expect(result).toBe("");
    });
  });

  describe("option parsers", () => {
    it("parseFrom should return value", () => {
      expect(command.parseFrom("phase-1")).toBe("phase-1");
    });

    it("parseTo should return value", () => {
      expect(command.parseTo("phase-2")).toBe("phase-2");
    });

    it("parseArtifacts should return true", () => {
      expect(command.parseArtifacts()).toBe(true);
    });

    it("parseValidate should return true", () => {
      expect(command.parseValidate()).toBe(true);
    });

    it("parseForce should return true", () => {
      expect(command.parseForce()).toBe(true);
    });
  });
});
