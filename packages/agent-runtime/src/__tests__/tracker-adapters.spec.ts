
import { rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { FileTrackerTraceAdapter } from '../adapters/tracker/file-tracker-trace.adapter';
import { OpenTelemetryTrackerTraceAdapter, type OTelTracer, type OTelSpan } from '../adapters/tracker/opentelemetry-tracker-adapter';
import { CompositeTrackerTraceAdapter } from '../adapters/tracker/composite-tracker-adapter';
import type { TraceEvent } from '../domain/contracts/trace';
import { tmpdir } from 'node:os';

describe('Tracker Adapters', () => {
  const dummyEvent: TraceEvent = {
    id: 'evt-123',
    type: 'core.evaluated',
    occurredAt: new Date().toISOString(),
    intent: 'test-intent',
    capability: 'test-capability',
    status: 'success',
    tenantId: 'tenant-1',
    productId: 'product-1',
    payload: { key: 'value' }
  };

  describe('FileTrackerTraceAdapter', () => {
    const testDir = tmpdir();
    const testFile = 'test-progress-audit.jsonl';
    const fullPath = join(testDir, testFile);

    beforeEach(async () => {
      try {
        await rm(fullPath);
      } catch (e) {
        // Ignore if file doesn't exist
      }
    });

    it('should append a serialized JSONL record to the file', async () => {
      const adapter = new FileTrackerTraceAdapter({ directory: testDir, filename: testFile });
      await adapter.publish(dummyEvent);

      const content = await readFile(fullPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(1);
      
      const parsed = JSON.parse(lines[0]);
      expect(parsed.id).toBe(dummyEvent.id);
      expect(parsed.type).toBe(dummyEvent.type);
    });

    it('should append multiple records when publishMany is called', async () => {
      const adapter = new FileTrackerTraceAdapter({ directory: testDir, filename: testFile });
      await adapter.publishMany([dummyEvent, { ...dummyEvent, id: 'evt-456' }]);

      const content = await readFile(fullPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(2);
      expect(JSON.parse(lines[1]).id).toBe('evt-456');
    });
  });

  describe('OpenTelemetryTrackerTraceAdapter', () => {
    it('should map TraceEvent fields to OpenTelemetry span attributes', async () => {
      const mockSpan: OTelSpan = {
        setAttribute: jest.fn().mockReturnThis(),
        end: jest.fn()
      };
      
      const mockTracer: OTelTracer = {
        startSpan: jest.fn().mockReturnValue(mockSpan)
      };

      const adapter = new OpenTelemetryTrackerTraceAdapter({ tracer: mockTracer });
      await adapter.publish(dummyEvent);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(`agent_runtime.core.evaluated`);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('evolith.event_id', 'evt-123');
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('evolith.intent', 'test-intent');
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('evolith.tenant_id', 'tenant-1');
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('evolith.payload', JSON.stringify({ key: 'value' }));
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('CompositeTrackerTraceAdapter', () => {
    it('should broadcast publish to all adapters', async () => {
      const adapter1 = { publish: jest.fn().mockResolvedValue(undefined) };
      const adapter2 = { publish: jest.fn().mockResolvedValue(undefined) };
      
      const composite = new CompositeTrackerTraceAdapter([adapter1, adapter2]);
      await composite.publish(dummyEvent);

      expect(adapter1.publish).toHaveBeenCalledWith(dummyEvent);
      expect(adapter2.publish).toHaveBeenCalledWith(dummyEvent);
    });

    it('should delegate publishMany to adapters that support it', async () => {
      const adapter1 = { 
        publish: jest.fn().mockResolvedValue(undefined),
        publishMany: jest.fn().mockResolvedValue(undefined) 
      };
      // adapter2 only has publish
      const adapter2 = { 
        publish: jest.fn().mockResolvedValue(undefined)
      };
      
      const composite = new CompositeTrackerTraceAdapter([adapter1, adapter2]);
      await composite.publishMany([dummyEvent, dummyEvent]);

      expect(adapter1.publishMany).toHaveBeenCalledWith([dummyEvent, dummyEvent]);
      expect(adapter1.publish).not.toHaveBeenCalled();
      
      // adapter2 should have publish called twice (loop fallback)
      expect(adapter2.publish).toHaveBeenCalledTimes(2);
    });
  });
});
