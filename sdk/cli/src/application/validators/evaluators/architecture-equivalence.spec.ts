import { RuleEvaluationEngine } from '../rule-evaluation-engine';
import { OpaEvaluator } from './opa-evaluator';
import { ArchitectureRuleHandler } from './handlers/architecture-rule.handler';
import { IFileSystem } from '../../../domain/interfaces';
import * as path from 'path';

const createMockFileSystem = (overrides?: Partial<IFileSystem>): IFileSystem => {
  const mock = {
    exists: jest.fn().mockResolvedValue(true),
    existsSync: jest.fn().mockReturnValue(true),
    readFile: jest.fn().mockResolvedValue(''),
    readJson: jest.fn().mockResolvedValue({}),
    readdirNames: jest.fn().mockResolvedValue([]),
    writeFile: jest.fn().mockResolvedValue(undefined),
    writeJson: jest.fn().mockResolvedValue(undefined),
    ensureDir: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => true, isFile: () => false }),
    ...overrides,
  };
  return mock as unknown as IFileSystem;
};

describe('Architecture Engine Equivalence', () => {
  let fs: IFileSystem;
  let handler: ArchitectureRuleHandler;

  beforeEach(() => {
    fs = createMockFileSystem();
    handler = new ArchitectureRuleHandler(fs);
  });

  const rule = {
    id: 'F1-R09',
    severity: 'MUST' as const,
    category: 'dependency-injection',
    title: 'Strict DIP',
    description: 'No manual new Service',
    validationQuery: '...',
    blocking: true
  };

  it('should produce equivalent findings for compliant project', async () => {
    const ctx = {
      satellitePath: '/satellite',
      corePath: '/core'
    };

    const nativeResult = await handler.evaluate(rule as unknown, ctx as unknown);
    expect(nativeResult.result).toBe('passed');
  });

  it('should produce equivalent findings for non-compliant project', async () => {
    const ctx = {
      satellitePath: '/satellite',
      corePath: '/core'
    };

    // Provide a mocked TS file with manual instantiation to fail the native evaluator
    (fs.readdirNames as jest.Mock).mockResolvedValueOnce(['test.ts']);
    (fs.stat as jest.Mock).mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true });
    (fs.readFile as jest.Mock).mockResolvedValueOnce('const a = new SomeService();');

    const nativeResult = await handler.evaluate(rule as unknown, ctx as unknown);
    expect(nativeResult).toBeDefined();
    expect(nativeResult.result).toBe('failed');
  });
});
