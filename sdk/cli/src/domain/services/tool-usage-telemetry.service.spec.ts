import { ToolUsageTelemetry } from './tool-usage-telemetry.service';
import * as fs from 'fs-extra';

jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(false),
  readFile: jest.fn().mockResolvedValue(''),
  appendFile: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
}));

const mockedFs = fs as unknown as {
  ensureDir: jest.Mock;
  pathExists: jest.Mock;
  readFile: jest.Mock;
  appendFile: jest.Mock;
  writeFile: jest.Mock;
  remove: jest.Mock;
};

describe('ToolUsageTelemetry', () => {
  let telemetry: ToolUsageTelemetry;
  let counter = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.pathExists.mockResolvedValue(false);
    mockedFs.readFile.mockResolvedValue('');
    mockedFs.appendFile.mockResolvedValue(undefined);
    mockedFs.remove.mockResolvedValue(undefined);
    telemetry = new ToolUsageTelemetry(`/tmp/test-telemetry-${Date.now()}-${++counter}`);
  });

  describe('initialize', () => {
    it('should create telemetry directory', async () => {
      await telemetry.initialize();
      expect(mockedFs.ensureDir).toHaveBeenCalled();
    });

    it('should load existing events from file', async () => {
      const now = new Date().toISOString();
      const mockEvents = [
        JSON.stringify({ timestamp: now, toolName: 'test-tool', durationMs: 100, success: true }),
        JSON.stringify({ timestamp: now, toolName: 'test-tool', durationMs: 200, success: false }),
      ].join('\n');

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(mockEvents);

      const newTelemetry = new ToolUsageTelemetry(`/tmp/test-telemetry-load-${Date.now()}-${++counter}`);
      await newTelemetry.initialize();
      const stats = await newTelemetry.getStats(30);

      expect(stats.length).toBe(1);
    });

    it('should skip invalid JSON lines', async () => {
      const now = new Date().toISOString();
      const mockContent = `invalid json\n{"timestamp":"${now}","toolName":"test","durationMs":100,"success":true}\n`;

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(mockContent);

      const newTelemetry = new ToolUsageTelemetry(`/tmp/test-telemetry-skip-${Date.now()}-${++counter}`);
      await newTelemetry.initialize();
      const stats = await newTelemetry.getStats(30);

      expect(stats.length).toBe(1);
    });
  });

  describe('recordEvent', () => {
    it('should record a successful event', async () => {
      await telemetry.recordEvent({ toolName: 'validate', durationMs: 150, success: true });
      expect(mockedFs.appendFile).toHaveBeenCalled();
    });

    it('should record a failed event with error message', async () => {
      await telemetry.recordEvent({ toolName: 'validate', durationMs: 50, success: false, errorMessage: 'Validation failed' });
      expect(mockedFs.appendFile).toHaveBeenCalled();
    });

    it('should include timestamp in recorded event', async () => {
      await telemetry.recordEvent({ toolName: 'test-tool', durationMs: 100, success: true });
      expect(mockedFs.appendFile).toHaveBeenCalledTimes(1);
      const callArg = mockedFs.appendFile.mock.calls[0][1] as string;
      const event = JSON.parse(callArg);
      expect(event.timestamp).toBeDefined();
      expect(event.toolName).toBe('test-tool');
    });

    it('should include context when provided', async () => {
      await telemetry.recordEvent({ toolName: 'test-tool', durationMs: 100, success: true, context: { key: 'value' } });
      expect(mockedFs.appendFile).toHaveBeenCalledTimes(1);
      const callArg = mockedFs.appendFile.mock.calls[0][1] as string;
      const event = JSON.parse(callArg);
      expect(event.context).toEqual({ key: 'value' });
    });
  });

  describe('getStats', () => {
    it('should return stats for recorded tools', async () => {
      await telemetry.recordEvent({ toolName: 'tool-a', durationMs: 100, success: true });
      await telemetry.recordEvent({ toolName: 'tool-a', durationMs: 200, success: true });
      await telemetry.recordEvent({ toolName: 'tool-b', durationMs: 150, success: false });

      const stats = await telemetry.getStats(30);
      const toolNames = stats.map(s => s.toolName);
      expect(toolNames).toContain('tool-a');
      expect(toolNames).toContain('tool-b');
    });

    it('should calculate average duration', async () => {
      await telemetry.recordEvent({ toolName: 'test-tool', durationMs: 100, success: true });
      await telemetry.recordEvent({ toolName: 'test-tool', durationMs: 200, success: true });

      const stats = await telemetry.getStats(30);
      const toolStats = stats.find(s => s.toolName === 'test-tool');
      expect(toolStats?.averageDurationMs).toBe(150);
    });

    it('should count success and error counts', async () => {
      await telemetry.recordEvent({ toolName: 'test-tool', durationMs: 100, success: true });
      await telemetry.recordEvent({ toolName: 'test-tool', durationMs: 100, success: false });
      await telemetry.recordEvent({ toolName: 'test-tool', durationMs: 100, success: true });

      const stats = await telemetry.getStats(30);
      const toolStats = stats.find(s => s.toolName === 'test-tool');
      expect(toolStats?.successCount).toBe(2);
      expect(toolStats?.errorCount).toBe(1);
    });
  });

  describe('generateReport', () => {
    it('should generate telemetry report', async () => {
      await telemetry.recordEvent({ toolName: 'tool-a', durationMs: 100, success: true });
      await telemetry.recordEvent({ toolName: 'tool-b', durationMs: 200, success: false, errorMessage: 'Error' });

      const report = await telemetry.generateReport(30);
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('totalEvents');
      expect(report).toHaveProperty('uniqueTools');
      expect(report).toHaveProperty('toolStats');
      expect(report).toHaveProperty('topErrors');
      expect(report).toHaveProperty('usageByHour');
    });

    it('should include top errors in report', async () => {
      await telemetry.recordEvent({ toolName: 'test-tool', durationMs: 100, success: false, errorMessage: 'Test error' });
      await telemetry.recordEvent({ toolName: 'test-tool', durationMs: 100, success: false, errorMessage: 'Test error' });

      const report = await telemetry.generateReport(30);
      expect(report.topErrors.length).toBeGreaterThan(0);
    });

    it('should include recommendation for low usage', async () => {
      await telemetry.recordEvent({ toolName: 'test-tool', durationMs: 100, success: true });

      const report = await telemetry.generateReport(30);
      expect(report.recommendation).toBeDefined();
    });
  });

  describe('exportCsv', () => {
    it('should export stats as CSV', async () => {
      await telemetry.recordEvent({ toolName: 'tool-a', durationMs: 100, success: true });
      const csv = await telemetry.exportCsv();
      expect(csv).toContain('Tool');
      expect(csv).toContain('tool-a');
    });
  });

  describe('clear', () => {
    it('should clear all telemetry data', async () => {
      await telemetry.recordEvent({ toolName: 'tool-a', durationMs: 100, success: true });
      await telemetry.clear();
      const stats = await telemetry.getStats(30);
      expect(stats.length).toBe(0);
    });
  });
});
