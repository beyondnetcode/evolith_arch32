import {
  ContextViolation, CouplingMetrics, DependencyInversionIssue,
  ImportNode, LAYER_ORDER, LayerViolation,
} from './types';
import { resolveImport } from './import-graph';

type Graph = Map<string, ImportNode>;

export function detectLayerViolations(graph: Graph): LayerViolation[] {
  const violations: LayerViolation[] = [];
  for (const [fromFile, node] of graph.entries()) {
    if (!node.layer) continue;
    const fromLayerIndex = LAYER_ORDER.indexOf(node.layer);
    if (fromLayerIndex === -1) continue;

    for (const importPath of node.imports) {
      const resolvedPath = resolveImport(graph as Map<string, unknown>, fromFile, importPath);
      if (!resolvedPath) continue;
      const targetNode = graph.get(resolvedPath);
      if (!targetNode?.layer) continue;
      const toLayerIndex = LAYER_ORDER.indexOf(targetNode.layer);
      if (toLayerIndex === -1) continue;
      if (toLayerIndex < fromLayerIndex) {
        violations.push({
          ruleId: 'ARCH-LAYER-01',
          fromLayer: node.layer, toLayer: targetNode.layer,
          fromFile, toFile: resolvedPath,
          severity: 'MUST', blocking: true,
        });
      }
    }
  }
  return violations;
}

export function detectContextViolations(graph: Graph): ContextViolation[] {
  const violations: ContextViolation[] = [];
  const contextFiles = new Map<string, string[]>();
  for (const [file, node] of graph.entries()) {
    if (!node.context) continue;
    if (!contextFiles.has(node.context)) contextFiles.set(node.context, []);
    contextFiles.get(node.context)!.push(file);
  }

  for (const [fromFile, node] of graph.entries()) {
    if (!node.context) continue;
    for (const importPath of node.imports) {
      const resolvedPath = resolveImport(graph as Map<string, unknown>, fromFile, importPath);
      if (!resolvedPath) continue;
      const targetNode = graph.get(resolvedPath);
      if (!targetNode?.context || targetNode.context === node.context) continue;
      const targetContextFiles = contextFiles.get(targetNode.context) || [];
      if (targetContextFiles.includes(resolvedPath)) {
        violations.push({
          ruleId: 'ARCH-CTX-01',
          fromContext: node.context, toContext: targetNode.context,
          fromFile, toFile: resolvedPath,
          severity: 'MUST', blocking: true,
        });
      }
    }
  }
  return violations;
}

export function calculateCouplingMetrics(graph: Graph): CouplingMetrics {
  const afferent: Record<string, number> = {};
  const efferent: Record<string, number> = {};

  for (const node of graph.values()) {
    if (!node.context) continue;
    if (!(node.context in afferent)) afferent[node.context] = 0;
    if (!(node.context in efferent)) efferent[node.context] = 0;
  }

  for (const [fromFile, node] of graph.entries()) {
    if (!node.context) continue;
    for (const importPath of node.imports) {
      const resolvedPath = resolveImport(graph as Map<string, unknown>, fromFile, importPath);
      if (!resolvedPath) continue;
      const targetNode = graph.get(resolvedPath);
      if (!targetNode?.context || targetNode.context === node.context) continue;
      efferent[node.context] = (efferent[node.context] || 0) + 1;
      afferent[targetNode.context] = (afferent[targetNode.context] || 0) + 1;
    }
  }

  const instability: Record<string, number> = {};
  const allContexts = new Set([...Object.keys(afferent), ...Object.keys(efferent)]);
  for (const context of allContexts) {
    const ce = efferent[context] || 0;
    const ca = afferent[context] || 0;
    const total = ce + ca;
    instability[context] = total > 0 ? ce / total : 0;
  }

  return { afferentCoupling: afferent, efferentCoupling: efferent, instability };
}

const ORM_PATTERNS = ['typeorm', 'prisma', 'mongoose', 'sequelize'];
const WEB_PATTERNS = ['express', 'fastify', 'koa', 'hono'];

export function detectDependencyInversionIssues(graph: Graph): DependencyInversionIssue[] {
  const issues: DependencyInversionIssue[] = [];
  for (const [file, node] of graph.entries()) {
    if (node.layer !== 'domain') continue;
    for (const importPath of node.imports) {
      if (ORM_PATTERNS.some(p => importPath.includes(p))) {
        issues.push({ ruleId: 'ARCH-DI-01', file, issue: `Domain layer directly imports ORM library: ${importPath}`, severity: 'MUST', blocking: true });
      }
      if (WEB_PATTERNS.some(p => importPath.includes(p))) {
        issues.push({ ruleId: 'ARCH-DI-02', file, issue: `Domain layer directly imports web framework: ${importPath}`, severity: 'MUST', blocking: true });
      }
      if (importPath.startsWith('@nestjs')) {
        issues.push({ ruleId: 'ARCH-DI-03', file, issue: `Domain layer imports NestJS framework: ${importPath}`, severity: 'SHOULD', blocking: false });
      }
    }
  }
  return issues;
}
