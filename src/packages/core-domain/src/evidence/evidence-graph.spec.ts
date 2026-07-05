import { EvidenceGraphBuilder, EvidenceNode } from './evidence-graph';

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

describe('EvidenceGraphBuilder', () => {
  it('should compute score 100 when all nodes valid', () => {
    const node: EvidenceNode = { artifactName: 'PRD', path: '/prd.md', found: true, schemaValid: true, timestamp: '2026-06-26' };
    const graph = new EvidenceGraphBuilder(1, mockLogger).addNode(node).build();
    expect(graph.score).toBe(100);
  });
  it('should compute score 0 when no nodes found', () => {
    const node: EvidenceNode = { artifactName: 'PRD', path: '/prd.md', found: false, schemaValid: false, timestamp: '2026-06-26' };
    const graph = new EvidenceGraphBuilder(1, mockLogger).addNode(node).build();
    expect(graph.score).toBe(0);
  });
  it('should return empty graph when no nodes added', () => {
    const graph = new EvidenceGraphBuilder(0, mockLogger).build();
    expect(graph.nodes).toHaveLength(0);
    expect(graph.score).toBe(0);
  });
});
