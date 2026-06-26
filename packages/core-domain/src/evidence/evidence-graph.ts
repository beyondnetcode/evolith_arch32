import { ILogger } from '../domain/interfaces';

export interface EvidenceNode {
  artifactName: string;
  path: string;
  found: boolean;
  schemaValid: boolean;
  timestamp: string;
}

export interface EvidenceEdge {
  from: string;
  to: string;
  relationship: 'requires' | 'validates' | 'blocks';
}

export interface EvidenceGraph {
  phase: number;
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  score: number;
}

export class EvidenceGraphBuilder {
  private nodes: EvidenceNode[] = [];
  private edges: EvidenceEdge[] = [];

  constructor(private readonly phase: number, private readonly logger: ILogger) {}

  addNode(node: EvidenceNode): this {
    this.nodes.push(node);
    return this;
  }

  addEdge(edge: EvidenceEdge): this {
    this.edges.push(edge);
    return this;
  }

  build(): EvidenceGraph {
    const found = this.nodes.filter(n => n.found && n.schemaValid).length;
    const score = this.nodes.length > 0 ? Math.round((found / this.nodes.length) * 100) : 0;
    this.logger.info(`EvidenceGraph phase ${this.phase}: ${found}/${this.nodes.length} nodes valid, score=${score}`);
    return { phase: this.phase, nodes: this.nodes, edges: this.edges, score };
  }
}
