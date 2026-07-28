import {
  ContextViolation, CouplingMetrics, DependencyInversionIssue,
  ImportNode, LAYER_ORDER, LayerViolation, SignalProvenance,
} from './types';
import { resolveImport } from './import-graph';
import {
  AdmissibilityPolicy,
  SignalCalibration,
  admitBlocking,
} from './signal-admissibility';

type Graph = Map<string, ImportNode>;

/**
 * GT-584 — how each detector describes its own evidence.
 *
 * Every one of them is `probabilistic`, and saying so is the point. The layer of
 * a file is INFERRED from a directory-name regex (`/\/services\//` ⇒
 * application), and the bounded context from the first path segment under
 * `src/`. Both are conventions, not facts: a repository that names a directory
 * differently is misclassified, and every finding built on top of the
 * misclassification is wrong. None of these rates has been measured (GT-585), so
 * none of them may block — see {@link admitBlocking}.
 */
const LAYER_INFERENCE: SignalCalibration = {
  determinism: 'probabilistic',
  method: 'layer inferred from directory-name patterns (LAYER_PATTERNS)',
};

const CONTEXT_INFERENCE: SignalCalibration = {
  determinism: 'probabilistic',
  method: 'bounded context inferred from the first path segment under src/',
};

const FRAMEWORK_IMPORT_IN_INFERRED_LAYER: SignalCalibration = {
  determinism: 'probabilistic',
  method: 'exact package-name match against a curated list, in a directory-inferred domain layer',
};

/** Per-detector calibration overrides, so a host that HAS measured can block. */
export interface DetectorOptions {
  /** Keyed by ruleId (`ARCH-LAYER-01`, `ARCH-CTX-01`, `ARCH-DI-01`, …). */
  readonly calibration?: Readonly<Record<string, SignalCalibration>>;
  readonly policy?: AdmissibilityPolicy;
}

/** Resolve the calibration a finding is judged under. */
function calibrationFor(
  ruleId: string,
  fallback: SignalCalibration,
  options?: DetectorOptions,
): SignalCalibration {
  return options?.calibration?.[ruleId] ?? fallback;
}

/**
 * Apply GT-584 admissibility and return the provenance block every finding
 * carries. `intendedBlocking` is what the detector WOULD have set before this
 * gate existed.
 */
function provenance(
  ruleId: string,
  intendedBlocking: boolean,
  fallback: SignalCalibration,
  options?: DetectorOptions,
): SignalProvenance & { blocking: boolean } {
  const calibration = calibrationFor(ruleId, fallback, options);
  const decision = admitBlocking(intendedBlocking, calibration, options?.policy);
  return {
    blocking: decision.blocking,
    determinism: decision.determinism,
    detectionMethod: calibration.method,
    admissibility: decision.admissibility,
    confidence: decision.confidence,
    downgradedFromBlocking: decision.downgradedFromBlocking,
    rationale: decision.rationale,
  };
}

/**
 * A layer may depend INWARD only: presentation → infrastructure → application →
 * domain, i.e. from a higher index in {@link LAYER_ORDER} to a lower one.
 *
 * GT-584 — this comparison used to be `toLayerIndex < fromLayerIndex`, which is
 * the legal direction. Every correct `application → domain` import in every
 * repository this analyzer was pointed at produced a `MUST`, `blocking: true`
 * ARCH-LAYER-01 violation, and every genuine `domain → infrastructure` inversion
 * passed. Its false-block rate was not merely unmeasured, it was 100% — which is
 * precisely why an unmeasured detector must not hold a blocking flag.
 */
function isInwardDependency(fromLayerIndex: number, toLayerIndex: number): boolean {
  return toLayerIndex <= fromLayerIndex;
}

export function detectLayerViolations(graph: Graph, options?: DetectorOptions): LayerViolation[] {
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
      if (isInwardDependency(fromLayerIndex, toLayerIndex)) continue;

      violations.push({
        ruleId: 'ARCH-LAYER-01',
        fromLayer: node.layer, toLayer: targetNode.layer,
        fromFile, toFile: resolvedPath,
        severity: 'MUST',
        ...provenance('ARCH-LAYER-01', true, LAYER_INFERENCE, options),
      });
    }
  }
  return violations;
}

export function detectContextViolations(graph: Graph, options?: DetectorOptions): ContextViolation[] {
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
          severity: 'MUST',
          ...provenance('ARCH-CTX-01', true, CONTEXT_INFERENCE, options),
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

const ORM_PACKAGES = ['typeorm', 'prisma', '@prisma/client', 'mongoose', 'sequelize'];
const WEB_PACKAGES = ['express', 'fastify', 'koa', 'hono'];

/**
 * The npm package an import specifier refers to, or `undefined` when it refers
 * to no package at all.
 *
 * GT-584 — the previous check was `importPath.includes('express')`. A relative
 * import can never resolve to an npm package, and `./value-objects/expression`
 * contains `express`; `@acme/prismatic-tokens` contains `prisma`;
 * `../typography/phonograph` contains `hono`. Each produced a `blocking: true`
 * MUST violation accusing the domain layer of importing a web framework.
 * Matching the package NAME removes that class of false block outright, which is
 * a better outcome than declaring a confidence for it.
 */
export function importedPackage(importPath: string): string | undefined {
  if (importPath.startsWith('.') || importPath.startsWith('/')) return undefined;
  const segments = importPath.split('/');
  return importPath.startsWith('@') && segments.length >= 2
    ? `${segments[0]}/${segments[1]}`
    : segments[0];
}

function isPackage(importPath: string, packages: readonly string[]): boolean {
  const pkg = importedPackage(importPath);
  return pkg !== undefined && packages.includes(pkg);
}

/** True for `@nestjs`, `@nestjs/common`, … and false for `@nestjs-lookalike/x`. */
function isNestJsPackage(importPath: string): boolean {
  const pkg = importedPackage(importPath);
  return pkg === '@nestjs' || (pkg?.startsWith('@nestjs/') ?? false);
}

export function detectDependencyInversionIssues(
  graph: Graph,
  options?: DetectorOptions,
): DependencyInversionIssue[] {
  const issues: DependencyInversionIssue[] = [];
  for (const [file, node] of graph.entries()) {
    if (node.layer !== 'domain') continue;
    for (const importPath of node.imports) {
      if (isPackage(importPath, ORM_PACKAGES)) {
        issues.push({
          ruleId: 'ARCH-DI-01', file,
          issue: `Domain layer directly imports ORM library: ${importPath}`,
          severity: 'MUST',
          ...provenance('ARCH-DI-01', true, FRAMEWORK_IMPORT_IN_INFERRED_LAYER, options),
        });
      }
      if (isPackage(importPath, WEB_PACKAGES)) {
        issues.push({
          ruleId: 'ARCH-DI-02', file,
          issue: `Domain layer directly imports web framework: ${importPath}`,
          severity: 'MUST',
          ...provenance('ARCH-DI-02', true, FRAMEWORK_IMPORT_IN_INFERRED_LAYER, options),
        });
      }
      if (isNestJsPackage(importPath)) {
        issues.push({
          ruleId: 'ARCH-DI-03', file,
          issue: `Domain layer imports NestJS framework: ${importPath}`,
          severity: 'SHOULD',
          // Already advisory before GT-584; the provenance is recorded anyway so
          // every finding on this surface is readable on the same scale.
          ...provenance('ARCH-DI-03', false, FRAMEWORK_IMPORT_IN_INFERRED_LAYER, options),
        });
      }
    }
  }
  return issues;
}
