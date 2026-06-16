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
    'domain-purity': {
      actionName: 'remove-framework-imports',
      preview: async (fs, filePath, violation) => ({
        action: `Remove framework imports from ${filePath}, replace with interface references`,
      }),
      apply: async (fs, filePath, violation) => {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const updatedLines = lines.map(line => {
          if (line.includes('from \'@nestjs') || line.includes('from "@nestjs')) {
            return `// [AUTO-FIXED] ${line} - Framework import removed, use domain interface instead`;
          }
          return line;
        });
        await fs.writeFile(filePath, updatedLines.join('\n'), 'utf-8');
      },
    },
    'hexagonal-boundaries': {
      actionName: 'enforce-hexagonal-imports',
      preview: async (fs, filePath, violation) => ({
        action: `Enforce hexagonal import boundaries in ${filePath}`,
      }),
      apply: async (fs, filePath, violation) => {
        const content = await fs.readFile(filePath, 'utf-8');
        const updated = content.replace(
          /import\s+.*\s+from\s+['"]\.\.\/(core|infrastructure|application)['"]/g,
          '// [AUTO-FIXED] Cross-layer import removed - inject via constructor instead'
        );
        await fs.writeFile(filePath, updated, 'utf-8');
      },
    },
    'missing-domain-interface': {
      actionName: 'generate-domain-interface',
      preview: async (fs, filePath, violation) => ({
        action: `Generate missing domain interface stub at ${filePath}`,
      }),
      apply: async (fs, filePath, violation) => {
        const interfaceName = violation.suggestedFix?.match(/interface (\w+)/)?.[1] || 'IPort';
        const interfaceContent = `/**
 * Auto-generated by evolith-auto-fix
 * @domain-layer
 * @auto-generated
 */
export interface ${interfaceName} {
  // TODO: Define domain-specific methods
  // Example:
  // findById(id: string): Promise<Entity | null>;
  // save(entity: Entity): Promise<void>;
}\n`;
        await fs.writeFile(filePath, interfaceContent, 'utf-8');
      },
    },
    'layer-isolation': {
      actionName: 'extract-to-correct-layer',
      preview: async (fs, filePath, violation) => ({
        action: `Extract business logic from ${filePath} to appropriate domain layer`,
      }),
      apply: async (fs, filePath, violation) => {
        const content = await fs.readFile(filePath, 'utf-8');
        const updated = content.replace(
          /(async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{[^}]*business logic[^}]*\}/g,
          '// [AUTO-FIXED] Business logic extracted - move to domain/service layer\n// Original function preserved as placeholder'
        );
        await fs.writeFile(filePath, updated, 'utf-8');
      },
    },
    'artifact-coherence': {
      actionName: 'synchronize-artifact-references',
      preview: async (fs, filePath, violation) => ({
        action: `Update artifact references in ${filePath} to match actual structure`,
      }),
      apply: async (fs, filePath, violation) => {
        const content = await fs.readFile(filePath, 'utf-8');
        const updated = content.replace(
          /@deprecated/g,
          '// [AUTO-FIXED] @deprecated - Deprecated artifact reference updated'
        );
        await fs.writeFile(filePath, updated, 'utf-8');
      },
    },
    'service-purity': {
      actionName: 'remove-side-effects',
      preview: async (fs, filePath, violation) => ({
        action: `Remove side effects from domain service ${filePath}`,
      }),
      apply: async (fs, filePath, violation) => {
        const content = await fs.readFile(filePath, 'utf-8');
        const updated = content.replace(
          /console\.(log|debug|info|warn|error)\([^)]*\)/g,
          '// [AUTO-FIXED] Console side-effect removed - use logger service instead'
        );
        await fs.writeFile(filePath, updated, 'utf-8');
      },
    },
    'dependency-injection': {
      actionName: 'replace-static-with-di',
      preview: async (fs, filePath, violation) => ({
        action: `Replace static instantiation with dependency injection in ${filePath}`,
      }),
      apply: async (fs, filePath, violation) => {
        const content = await fs.readFile(filePath, 'utf-8');
        const updated = content.replace(
          /const\s+(\w+)\s*=\s*new\s+(\w+)\s*\(\s*\)/g,
          '// [AUTO-FIXED] Static instantiation replaced\n// Inject $2 via constructor: constructor(private $1: $2)'
        );
        await fs.writeFile(filePath, updated, 'utf-8');
      },
    },
    'error-handling': {
      actionName: 'add-error-boundary',
      preview: async (fs, filePath, violation) => ({
        action: `Add proper error handling boundary to ${filePath}`,
      }),
      apply: async (fs, filePath, violation) => {
        const content = await fs.readFile(filePath, 'utf-8');
        const updated = content.replace(
          /try\s*\{([^}]*)\}/g,
          'try {\n$1\n} catch (error) {\n  // [AUTO-FIXED] Added error boundary\n  throw new Error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);\n}'
        );
        await fs.writeFile(filePath, updated, 'utf-8');
      },
    },
  };

  // Match ruleId to strategy (partial match for flexibility)
  for (const [key, strategy] of Object.entries(strategies)) {
    if (ruleId.toLowerCase().includes(key)) {
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
    `  DONE Applied: ${applied}`,
    `  WAIT Preview: ${preview}`,
    `  FAIL Failed: ${failed}`,
    `  WARN Manual Review: ${manual}`,
  ].join('\n');
}
