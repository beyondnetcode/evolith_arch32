import { ADRCommand } from './adr.command';

jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  outro: jest.fn(),
  select: jest.fn(),
  text: jest.fn(),
  confirm: jest.fn(),
  multiselect: jest.fn(),
  group: jest.fn(),
  spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    message: jest.fn(),
  },
}));

jest.mock('chalk', () => {
  const chalkFn = (str: string) => str;
  chalkFn.green = (str: string) => str;
  chalkFn.red = (str: string) => str;
  chalkFn.bold = (str: string) => str;
  chalkFn.yellow = (str: string) => str;
  chalkFn.blue = (str: string) => str;
  chalkFn.cyan = (str: string) => str;
  chalkFn.gray = (str: string) => str;
  chalkFn.bgCyan = { white: { bold: (str: string) => str } };
  return chalkFn;
});

jest.mock('../../core/di/container', () => ({
  getContainer: jest.fn(() => ({
    createFileSystem: jest.fn(() => ({
      exists: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      readJson: jest.fn(),
      writeJson: jest.fn(),
      ensureDir: jest.fn(),
      readdirNames: jest.fn(),
      existsSync: jest.fn(),
    })),
  })),
}));

jest.mock('../../core/observability', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  OperationTimer: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    end: jest.fn().mockReturnValue(100),
  })),
}));

jest.mock('../../domain/services/adr.service', () => ({
  ADRService: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    list: jest.fn(),
    get: jest.fn(),
    updateStatus: jest.fn(),
    getMatrix: jest.fn(),
  })),
}));

import * as p from '@clack/prompts';
import { ADRService } from '../../domain/services/adr.service';

const mockCreate = jest.fn();
const mockList = jest.fn();
const mockGet = jest.fn();
const mockUpdateStatus = jest.fn();
const mockGetMatrix = jest.fn();

(ADRService as jest.Mock).mockImplementation(() => ({
  create: mockCreate,
  list: mockList,
  get: mockGet,
  updateStatus: mockUpdateStatus,
  getMatrix: mockGetMatrix,
}));

describe('ADRCommand', () => {
  let command: ADRCommand;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    command = new ADRCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({ id: 'ADR-0001', title: 'Test', status: 'Proposed', date: '2024-01-01' });
    mockList.mockResolvedValue([]);
    mockGet.mockResolvedValue(undefined);
    mockUpdateStatus.mockResolvedValue(undefined);
    mockGetMatrix.mockResolvedValue({ adrs: [], lastUpdated: '2024-01-01', summary: { total: 0, proposed: 0, accepted: 0, deprecated: 0 } });
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('run', () => {
    it('should run in interactive mode when no options provided', async () => {
      (p.select as jest.Mock).mockResolvedValue('list');
      mockList.mockResolvedValue([]);

      await command.run([], {});

      expect(p.intro).toHaveBeenCalled();
      expect(p.select).toHaveBeenCalled();
    });

    it('should create ADR when --create flag is passed', async () => {
      (p.text as jest.Mock)
        .mockResolvedValueOnce('Use PostgreSQL')
        .mockResolvedValueOnce('Need to decide on database')
        .mockResolvedValueOnce('Selected PostgreSQL for reliability')
        .mockResolvedValueOnce('Better performance | ACID compliance')
        .mockResolvedValueOnce('Higher cost | More complex setup')
        .mockResolvedValueOnce('database, backend');
      mockCreate.mockResolvedValue({
        id: 'ADR-0001',
        title: 'Use PostgreSQL',
        status: 'Proposed',
        date: '2024-01-01',
      });

      await command.run([], { create: true });

      expect(mockCreate).toHaveBeenCalled();
      expect(p.log.success).toHaveBeenCalled();
    });

    it('should list ADRs when --list flag is passed', async () => {
      mockList.mockResolvedValue([
        {
          id: 'ADR-0001',
          title: 'Use PostgreSQL as primary database',
          status: 'Accepted',
          date: '2024-01-01',
        },
        {
          id: 'ADR-0002',
          title: 'Use Redis for caching',
          status: 'Proposed',
          date: '2024-01-02',
        },
      ]);

      await command.run([], { list: true });

      expect(mockList).toHaveBeenCalled();
      expect(p.log.info).toHaveBeenCalled();
    });

    it('should show warning when no ADRs to list', async () => {
      mockList.mockResolvedValue([]);

      await command.run([], { list: true });

      expect(p.log.warn).toHaveBeenCalled();
    });

    it('should get ADR when --get flag is passed with id', async () => {
      mockGet.mockResolvedValue({
        id: 'ADR-0001',
        title: 'Use PostgreSQL',
        status: 'Accepted',
        date: '2024-01-01',
        context: 'Need reliable database',
        decision: 'Selected PostgreSQL',
        consequences: {
          positive: ['Reliable', 'ACID'],
          negative: ['Cost'],
        },
        tags: ['database'],
      });

      await command.run([], { get: 'ADR-0001' });

      expect(mockGet).toHaveBeenCalledWith('ADR-0001');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('ADR-0001')
      );
    });

    it('should show error when ADR not found', async () => {
      mockGet.mockResolvedValue(undefined);

      await command.run([], { get: 'ADR-9999' });

      expect(p.log.error).toHaveBeenCalled();
    });

    it('should update ADR status when --update flag is passed', async () => {
      mockUpdateStatus.mockResolvedValue({
        id: 'ADR-0001',
        title: 'Use PostgreSQL',
        status: 'Accepted',
        date: '2024-01-01',
        context: 'Need reliable database',
        decision: 'Selected PostgreSQL',
        consequences: {
          positive: ['Reliable'],
          negative: ['Cost'],
          neutral: ['Status changed to Accepted: Approved by team'],
        },
      });

      await command.run([], {
        update: 'ADR-0001',
        status: 'Accepted',
        reason: 'Approved by team',
      });

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        'ADR-0001',
        'Accepted',
        'Approved by team',
        false
      );
      expect(p.log.success).toHaveBeenCalled();
    });

    it('should show error when updating non-existent ADR', async () => {
      mockUpdateStatus.mockResolvedValue(undefined);

      await command.run([], {
        update: 'ADR-9999',
        status: 'Accepted',
      });

      expect(p.log.error).toHaveBeenCalled();
    });

    it('should show error when update missing status', async () => {
      await command.run([], { update: 'ADR-0001' });

      expect(p.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Estado requerido')
      );
    });

    it('should handle update errors gracefully', async () => {
      mockUpdateStatus.mockRejectedValue(new Error('Update failed'));

      await command.run([], {
        update: 'ADR-0001',
        status: 'Accepted',
      });

      expect(p.log.error).toHaveBeenCalled();
    });

    it('should show ADR matrix when --matrix flag is passed', async () => {
      mockGetMatrix.mockResolvedValue({
        adrs: [
          {
            id: 'ADR-0001',
            title: 'Use PostgreSQL',
            status: 'Accepted',
            date: '2024-01-01',
            context: 'Context',
            decision: 'Decision',
            consequences: { positive: ['Good'], negative: ['Bad'] },
          },
        ],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        summary: {
          total: 5,
          proposed: 2,
          accepted: 2,
          deprecated: 1,
        },
      });

      await command.run([], { matrix: true });

      expect(mockGetMatrix).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('ADR MATRIX SUMMARY')
      );
    });

    it('should show matrix with truncated long titles', async () => {
      mockGetMatrix.mockResolvedValue({
        adrs: [
          {
            id: 'ADR-0001',
            title: 'This is a very long ADR title that should be truncated in the matrix display',
            status: 'Accepted',
            date: '2024-01-01',
            context: 'Context',
            decision: 'Decision',
            consequences: { positive: [], negative: [] },
          },
        ],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        summary: {
          total: 1,
          proposed: 0,
          accepted: 1,
          deprecated: 0,
        },
      });

      await command.run([], { matrix: true });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('...')
      );
    });

    it('should show matrix with no recent ADRs', async () => {
      mockGetMatrix.mockResolvedValue({
        adrs: [],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        summary: {
          total: 0,
          proposed: 0,
          accepted: 0,
          deprecated: 0,
        },
      });

      await command.run([], { matrix: true });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Total ADRs')
      );
    });

    it('should handle create ADR errors gracefully', async () => {
      (p.text as jest.Mock)
        .mockResolvedValueOnce('Test ADR')
        .mockResolvedValueOnce('Context')
        .mockResolvedValueOnce('Decision')
        .mockResolvedValueOnce('Positive')
        .mockResolvedValueOnce('Negative')
        .mockResolvedValueOnce('');
      mockCreate.mockRejectedValue(new Error('Create failed'));

      await command.run([], { create: true });

      expect(p.log.error).toHaveBeenCalled();
    });
  });

  describe('interactive mode', () => {
    it('should handle create action in interactive mode', async () => {
      (p.text as jest.Mock)
        .mockResolvedValueOnce('Interactive ADR')
        .mockResolvedValueOnce('Context')
        .mockResolvedValueOnce('Decision')
        .mockResolvedValueOnce('Positive')
        .mockResolvedValueOnce('Negative')
        .mockResolvedValueOnce('');
      (p.select as jest.Mock)
        .mockResolvedValueOnce('create')
        .mockResolvedValueOnce('Accepted');
      mockCreate.mockResolvedValue({
        id: 'ADR-0001',
        title: 'Interactive ADR',
        status: 'Proposed',
        date: '2024-01-01',
      });

      await command.run([], {});

      expect(p.intro).toHaveBeenCalled();
    });

    it('should handle list action in interactive mode', async () => {
      (p.select as jest.Mock).mockResolvedValue('list');
      mockList.mockResolvedValue([]);

      await command.run([], {});

      expect(p.intro).toHaveBeenCalled();
    });

    it('should handle matrix action in interactive mode', async () => {
      (p.select as jest.Mock).mockResolvedValue('matrix');
      mockGetMatrix.mockResolvedValue({
        adrs: [],
        lastUpdated: '2024-01-01',
        summary: { total: 0, proposed: 0, accepted: 0, deprecated: 0 },
      });

      await command.run([], {});

      expect(p.intro).toHaveBeenCalled();
    });

    it('should handle get action in interactive mode', async () => {
      (p.select as jest.Mock).mockResolvedValue('get');
      (p.text as jest.Mock).mockResolvedValue('ADR-0001');
      mockGet.mockResolvedValue(undefined);

      await command.run([], {});

      expect(p.intro).toHaveBeenCalled();
    });

    it('should handle update action in interactive mode', async () => {
      (p.select as jest.Mock)
        .mockResolvedValueOnce('update')
        .mockResolvedValueOnce('Deprecated');
      (p.text as jest.Mock)
        .mockResolvedValueOnce('ADR-0001')
        .mockResolvedValueOnce('No longer needed');
      mockUpdateStatus.mockResolvedValue({
        id: 'ADR-0001',
        title: 'Old ADR',
        status: 'Deprecated',
        date: '2024-01-01',
        context: 'Context',
        decision: 'Decision',
        consequences: { positive: [], negative: [] },
      });

      await command.run([], {});

      expect(p.intro).toHaveBeenCalled();
    });
  });

  describe('dryRun mode', () => {
    it('should simulate create action when --dry-run flag is passed', async () => {
      (p.text as jest.Mock)
        .mockResolvedValueOnce('Simulated ADR')
        .mockResolvedValueOnce('Context')
        .mockResolvedValueOnce('Decision')
        .mockResolvedValueOnce('Positive')
        .mockResolvedValueOnce('Negative')
        .mockResolvedValueOnce('');
      mockCreate.mockResolvedValue({
        id: 'ADR-0001',
        title: 'Simulated ADR',
        status: 'Proposed',
        date: '2024-01-01',
      });

      await command.run([], { create: true, dryRun: true });

      expect(mockCreate).toHaveBeenCalledWith(expect.anything(), true);
      expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining('[DRY-RUN]'));
    });

    it('should simulate update action when --dry-run flag is passed', async () => {
      mockUpdateStatus.mockResolvedValue({
        id: 'ADR-0001',
        title: 'Old ADR',
        status: 'Accepted',
        date: '2024-01-01',
        context: 'Context',
        decision: 'Decision',
        consequences: { positive: [], negative: [] },
      });

      await command.run([], {
        update: 'ADR-0001',
        status: 'Accepted',
        dryRun: true,
      });

      expect(mockUpdateStatus).toHaveBeenCalledWith('ADR-0001', 'Accepted', undefined, true);
      expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining('[DRY-RUN]'));
    });
  });

  describe('option parsers', () => {
    it('should parse create option', () => {
      expect(command.parseCreate()).toBe(true);
    });

    it('should parse list option', () => {
      expect(command.parseList()).toBe(true);
    });

    it('should parse get option', () => {
      expect(command.parseGet('ADR-0001')).toBe('ADR-0001');
    });

    it('should parse update option', () => {
      expect(command.parseUpdate('ADR-0001')).toBe('ADR-0001');
    });

    it('should parse status option', () => {
      expect(command.parseStatus('Accepted')).toBe('Accepted');
    });

    it('should parse reason option', () => {
      expect(command.parseReason('Some reason')).toBe('Some reason');
    });

    it('should parse matrix option', () => {
      expect(command.parseMatrix()).toBe(true);
    });

    it('should parse dry-run option', () => {
      expect(command.parseDryRun()).toBe(true);
    });
  });
});
