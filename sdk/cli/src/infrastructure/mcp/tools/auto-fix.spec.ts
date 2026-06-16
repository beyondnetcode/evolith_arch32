import { getAutoFixTools } from './auto-fix';
import { IFileSystem } from '@evolith/core-domain/domain/interfaces';

describe('Auto-Fix MCP Tools', () => {
  describe('getAutoFixTools', () => {
    it('should return auto-fix tool with correct schema', () => {
      const mockFs = {} as IFileSystem;
      const mockConfigParser = {} as IConfigParser;
      
      const tools = getAutoFixTools(mockFs, mockConfigParser);
      
      expect(tools).toHaveLength(1);
      expect(tools[0].schema.name).toBe('evolith-auto-fix');
      expect(tools[0].schema.description).toContain('automatic fixes');
      expect(tools[0].mutative).toBe(true);
    });

    it('should require rulesetId in input schema', () => {
      const mockFs = {} as IFileSystem;
      const mockConfigParser = {} as IConfigParser;
      
      const tools = getAutoFixTools(mockFs, mockConfigParser);
      
      expect(tools[0].schema.inputSchema.required).toContain('rulesetId');
    });
  });

  describe('evolith-auto-fix execute', () => {
    it('should handle dry-run mode without applying changes', async () => {
      const mockFs = {
        readFile: jest.fn().mockResolvedValue('export class Test {}'),
        writeFile: jest.fn(),
      } as unknown as IFileSystem;
      const mockConfigParser = {} as IConfigParser;
      
      const tools = getAutoFixTools(mockFs, mockConfigParser);
      const tool = tools[0];
      
      const result = await tool.execute({
        rulesetId: 'domain-purity',
        violations: [
          {
            ruleId: 'domain-must-be-pure',
            filePath: 'src/domain/test.ts',
            message: 'Domain layer must be framework-agnostic',
          },
        ],
        dryRun: true,
      });

      expect(result).toHaveProperty('rulesetId', 'domain-purity');
      expect(result).toHaveProperty('totalViolations', 1);
      expect(result.fixesPreview).toBeDefined();
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should apply fixes when dryRun is false', async () => {
      const mockFs = {
        readFile: jest.fn().mockResolvedValue('export class Test {}'),
        writeFile: jest.fn(),
        exists: jest.fn().mockResolvedValue(true),
      } as unknown as IFileSystem;
      const mockConfigParser = {} as IConfigParser;
      
      const tools = getAutoFixTools(mockFs, mockConfigParser);
      const tool = tools[0];
      
      await tool.execute({
        rulesetId: 'domain-purity',
        violations: [
          {
            ruleId: 'missing-domain-interface',
            filePath: 'src/domain/IPort.ts',
            message: 'Missing domain interface',
          },
        ],
        dryRun: false,
      });

      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle violations with no auto-fix strategy', async () => {
      const mockFs = {} as IFileSystem;
      const mockConfigParser = {} as IConfigParser;
      
      const tools = getAutoFixTools(mockFs, mockConfigParser);
      const tool = tools[0];
      
      const result = await tool.execute({
        rulesetId: 'custom-ruleset',
        violations: [
          {
            ruleId: 'unknown-violation-type',
            filePath: 'src/test.ts',
            message: 'Unknown violation',
          },
        ],
        dryRun: true,
      });

      expect(result.fixesApplied).toBe(0);
      expect(result.summary).toContain('Manual Review');
    });

    it('should handle multiple violations', async () => {
      const mockFs = {
        readFile: jest.fn().mockResolvedValue('export class Test {}'),
        writeFile: jest.fn(),
      } as unknown as IFileSystem;
      const mockConfigParser = {} as IConfigParser;
      
      const tools = getAutoFixTools(mockFs, mockConfigParser);
      const tool = tools[0];
      
      const result = await tool.execute({
        rulesetId: 'hexagonal-boundaries',
        violations: [
          {
            ruleId: 'domain-must-be-pure',
            filePath: 'src/domain/service.ts',
            message: 'Framework import in domain',
          },
          {
            ruleId: 'hexagonal-boundaries',
            filePath: 'src/application/usecase.ts',
            message: 'Direct infrastructure access',
          },
          {
            ruleId: 'missing-domain-interface',
            filePath: 'src/domain/IPort.ts',
            message: 'Missing port interface',
          },
        ],
        dryRun: true,
      });

      expect(result.totalViolations).toBe(3);
      expect(result.fixesPreview).toHaveLength(3);
    });
  });

  describe('generateSummary', () => {
    it('should generate correct summary for mixed fix results', async () => {
      const mockFs = {
        readFile: jest.fn().mockResolvedValue('export class Test {}'),
        writeFile: jest.fn(),
      } as unknown as IFileSystem;
      const mockConfigParser = {} as IConfigParser;
      
      const tools = getAutoFixTools(mockFs, mockConfigParser);
      const tool = tools[0];
      
      const result = await tool.execute({
        rulesetId: 'test',
        violations: [
          { ruleId: 'missing-domain-interface', filePath: 'a.ts', message: 'test' },
          { ruleId: 'unknown', filePath: 'b.ts', message: 'test' },
        ],
        dryRun: true,
      });

      expect(result.summary).toContain('Applied:');
      expect(result.summary).toContain('Preview:');
      expect(result.summary).toContain('Manual Review:');
    });
  });

  describe('domain fix strategies', () => {
    it('should apply domain-purity fix strategy', async () => {
      const mockFs = {
        readFile: jest.fn().mockResolvedValue('import { Module } from \'@nestjs/common\';\nexport class Test {}'),
        writeFile: jest.fn(),
      } as unknown as IFileSystem;
      const mockConfigParser = {} as IConfigParser;
      
      const tools = getAutoFixTools(mockFs, mockConfigParser);
      const tool = tools[0];
      
      await tool.execute({
        rulesetId: 'domain-purity',
        violations: [
          {
            ruleId: 'domain-purity',
            filePath: 'src/domain/test.ts',
            message: 'Framework import in domain layer',
          },
        ],
        dryRun: false,
      });

      expect(mockFs.writeFile).toHaveBeenCalled();
      const writtenContent = (mockFs.writeFile as jest.Mock).mock.calls[0][1];
      expect(writtenContent).toContain('[AUTO-FIXED]');
      expect(writtenContent).toContain('Framework import removed');
    });

    it('should apply layer-isolation fix strategy', async () => {
      const mockFs = {
        readFile: jest.fn().mockResolvedValue('function process() { /* business logic */ }'),
        writeFile: jest.fn(),
      } as unknown as IFileSystem;
      const mockConfigParser = {} as IConfigParser;
      
      const tools = getAutoFixTools(mockFs, mockConfigParser);
      const tool = tools[0];
      
      await tool.execute({
        rulesetId: 'layer-isolation',
        violations: [
          {
            ruleId: 'layer-isolation',
            filePath: 'src/infrastructure/test.ts',
            message: 'Business logic in infrastructure layer',
          },
        ],
        dryRun: false,
      });

      expect(mockFs.writeFile).toHaveBeenCalled();
      const writtenContent = (mockFs.writeFile as jest.Mock).mock.calls[0][1];
      expect(writtenContent).toContain('[AUTO-FIXED]');
      expect(writtenContent).toContain('Business logic extracted');
    });

    it('should apply artifact-coherence fix strategy', async () => {
      const mockFs = {
        readFile: jest.fn().mockResolvedValue('/**\n * @deprecated Old artifact\n */\nexport class OldClass {}'),
        writeFile: jest.fn(),
      } as unknown as IFileSystem;
      const mockConfigParser = {} as IConfigParser;
      
      const tools = getAutoFixTools(mockFs, mockConfigParser);
      const tool = tools[0];
      
      await tool.execute({
        rulesetId: 'artifact-coherence',
        violations: [
          {
            ruleId: 'artifact-coherence',
            filePath: 'src/domain/old.ts',
            message: 'Deprecated artifact reference',
          },
        ],
        dryRun: false,
      });

      expect(mockFs.writeFile).toHaveBeenCalled();
      const writtenContent = (mockFs.writeFile as jest.Mock).mock.calls[0][1];
      expect(writtenContent).toContain('[AUTO-FIXED]');
      expect(writtenContent).toContain('Deprecated artifact reference updated');
    });

    it('should apply service-purity fix strategy', async () => {
      const mockFs = {
        readFile: jest.fn().mockResolvedValue('console.log("debug");\nexport class Service {}'),
        writeFile: jest.fn(),
      } as unknown as IFileSystem;
      const mockConfigParser = {} as IConfigParser;
      
      const tools = getAutoFixTools(mockFs, mockConfigParser);
      const tool = tools[0];
      
      await tool.execute({
        rulesetId: 'service-purity',
        violations: [
          {
            ruleId: 'service-purity',
            filePath: 'src/domain/service.ts',
            message: 'Side effect in domain service',
          },
        ],
        dryRun: false,
      });

      expect(mockFs.writeFile).toHaveBeenCalled();
      const writtenContent = (mockFs.writeFile as jest.Mock).mock.calls[0][1];
      expect(writtenContent).toContain('[AUTO-FIXED]');
      expect(writtenContent).toContain('Console side-effect removed');
    });

    it('should support all 6 domain strategies', async () => {
      const strategies = [
        'domain-purity',
        'hexagonal-boundaries',
        'missing-domain-interface',
        'layer-isolation',
        'artifact-coherence',
        'service-purity',
      ];

      const mockFs = {
        readFile: jest.fn().mockResolvedValue('test content'),
        writeFile: jest.fn(),
      } as unknown as IFileSystem;
      const mockConfigParser = {} as IConfigParser;
      
      const tools = getAutoFixTools(mockFs, mockConfigParser);
      const tool = tools[0];

      for (const strategy of strategies) {
        const result = await tool.execute({
          rulesetId: strategy,
          violations: [
            {
              ruleId: strategy,
              filePath: 'src/test.ts',
              message: 'Test violation',
            },
          ],
          dryRun: true,
        });

        expect(result.fixesPreview).toHaveLength(1);
        expect(result.fixesPreview[0].status).toBe('preview-ready');
      }
    });
  });
});
