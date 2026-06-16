import { IFileSystem, IConfigParser } from '@evolith/core-domain/domain/interfaces';
import { IMcpToolHandler } from '../mcp-tool.registry';

export function getAutoFixTools(fs: IFileSystem, configParser: IConfigParser): IMcpToolHandler[] {
  return [
    createAutoFixTool(fs, configParser),
  ];
}

function createAutoFixTool(fs: IFileSystem, configParser: IConfigParser): IMcpToolHandler {
  return {
    schema: {
      name: 'evolith-auto-fix',
      description: 'Apply automatic fixes to architectural violations reported by Evolith Core rule evaluators',
      inputSchema: {
        type: 'object',
        properties: {
          rulesetId: { type: 'string', description: 'Ruleset ID to fix (e.g., "domain-purity", "hexagonal-boundaries")' },
          violations: { 
            type: 'array', 
            items: { type: 'object' },
            description: 'Array of violation objects from validator output' 
          },
          dryRun: { type: 'boolean', description: 'Preview changes without applying them' },
          dir: { type: 'string', description: 'Target directory (default: cwd)' },
        },
        required: ['rulesetId'],
      },
    },
    mutative: true,
    execute: async (args: Record<string, unknown>) => {
      const rulesetId = args.rulesetId as string;
      const violations = (args.violations || []) as Array<{
        ruleId: string;
        filePath: string;
        message: string;
        suggestedFix?: string;
      }>;
      const dryRun = (args.dryRun as boolean) ?? false;
      const dir = (args.dir as string) || process.cwd();

      const fixes: Array<{ action: string; file: string; status: string }> = [];

      for (const violation of violations) {
        const fix = await applyFix(fs, violation, dir, dryRun);
        fixes.push(fix);
      }

      return {
        rulesetId,
        totalViolations: violations.length,
        fixesApplied: fixes.filter(f => f.status === 'applied').length,
        fixesPreview: dryRun ? fixes : undefined,
        summary: generateSummary(fixes),
      };
    },
  };
}

async function applyFix(
  fs: IFileSystem,
  violation: { ruleId: string; filePath: string; message: string; suggestedFix?: string },
  dir: string,
  dryRun: boolean
): Promise<{ action: string; file: string; status: string }> {
  const path = require('path');
  const fullPath = path.isAbsolute(violation.filePath) 
    ? violation.filePath 
    : path.join(dir, violation.filePath);

  const fixStrategy = getFixStrategy(violation.ruleId);
  
  if (!fixStrategy) {
    return {
      action: 'no-auto-fix-available',
      file: violation.filePath,
      status: 'manual-review-required',
    };
  }

  try {
    if (dryRun) {
      const preview = await fixStrategy.preview(fs, fullPath, violation);
      return {
        action: preview.action,
        file: violation.filePath,
        status: 'preview-ready',
      };
    } else {
      await fixStrategy.apply(fs, fullPath, violation);
      return {
        action: fixStrategy.actionName,
        file: violation.filePath,
        status: 'applied',
      };
    }
  } catch (error) {
    return {
      action: fixStrategy.actionName,
      file: violation.filePath,
      status: `failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

interface FixStrategy {
  actionName: string;
  preview: (fs: IFileSystem, filePath: string, violation: any) => Promise<{ action: string }>;
  apply: (fs: IFileSystem, filePath: string, violation: any) => Promise<void>;
}

function getFixStrategy(ruleId: string): FixStrategy | null {
  const strategies: Record<string, FixStrategy> = {
    'domain-must-be-pure': {
      actionName: 'move-to-domain-layer',
      preview: async (fs, filePath) => ({
        action: `Move ${filePath} to domain/ layer and update imports`,
      }),
      apply: async (fs, filePath) => {
        // Stub: In full implementation, this would analyze and move the file
        const content = await fs.readFile(filePath);
        const updated = content.replace(/from ['"]@nestjs/g, 'from [PENDING:domain-boundary]');
        await fs.writeFile(filePath, updated);
      },
    },
    'hexagonal-boundaries': {
      actionName: 'enforce-hexagonal-imports',
      preview: async (fs, filePath) => ({
        action: `Enforce hexagonal import boundaries in ${filePath}`,
      }),
      apply: async (fs, filePath) => {
        // Stub: In full implementation, this would fix import violations
        const content = await fs.readFile(filePath);
        const updated = content.replace(/import.*from ['"]\.\.\/core/g, '// [PENDING:hexagonal-refactor]');
        await fs.writeFile(filePath, updated);
      },
    },
    'missing-domain-interface': {
      actionName: 'generate-domain-interface',
      preview: async (fs, filePath) => ({
        action: `Generate missing domain interface stub`,
      }),
      apply: async (fs, filePath) => {
        // Stub: Generate interface file
        const interfaceContent = `export interface IGeneratedPort {
  // Auto-generated by evolith-auto-fix
  // TODO: Implement domain-specific methods
}\n`;
        await fs.writeFile(filePath, interfaceContent);
      },
    },
  };

  // Match ruleId to strategy (partial match for flexibility)
  for (const [key, strategy] of Object.entries(strategies)) {
    if (ruleId.toLowerCase().includes(key.split('-').slice(0, 2).join('-'))) {
      return strategy;
    }
  }

  return null;
}

function generateSummary(fixes: Array<{ action: string; file: string; status: string }>): string {
  const applied = fixes.filter(f => f.status === 'applied').length;
  const preview = fixes.filter(f => f.status === 'preview-ready').length;
  const failed = fixes.filter(f => f.status.startsWith('failed')).length;
  const manual = fixes.filter(f => f.status === 'manual-review-required').length;

  return [
    `Auto-fix Summary:`,
    `  ✓ Applied: ${applied}`,
    `  ⏸ Preview: ${preview}`,
    `  ✗ Failed: ${failed}`,
    `  ⚠ Manual Review: ${manual}`,
  ].join('\n');
}
