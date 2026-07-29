import * as path from 'node:path';

/**
 * Single source of truth for "where does artifact X live?".
 *
 * Two tiers are modelled, and the order matters:
 *  1. The satellite-native path — the real artifact a satellite project is
 *     expected to produce (e.g. a filled-in `docs/prd.md`).
 *  2. The Core template path — the canonical blank template shipped by the
 *     Evolith Core repository. Only meaningful when a `corePath` is known,
 *     and only as a fallback for artifacts with no satellite-native location.
 *
 * Collapsing the two tiers into one map is what made `evolith-sdlc-status`
 * ask satellites for `reference/core/sdlc/04-artifact-templates/prd-template.md`
 * — a template no satellite will ever contain — instead of their own PRD.
 * Every consumer must go through {@link resolveArtifactPath}.
 */

/**
 * Satellite-native paths for each artifact, relative to the satellite project root.
 * These are the real locations where a satellite is expected to produce evidence.
 * Defined as a function so the satelliteRoot is applied at resolution time.
 */
export function buildSatelliteArtifactPaths(satelliteRoot: string): Record<string, string> {
  return {
    'PRD': path.join(satelliteRoot, 'docs', 'prd.md'),
    'Discovery Canvas': path.join(satelliteRoot, 'docs', 'discovery-canvas.md'),
    'Technical Feasibility Canvas': path.join(satelliteRoot, 'docs', 'technical-feasibility.md'),
    'Ballpark Estimation': path.join(satelliteRoot, 'docs', 'ballpark-estimation.md'),
    'MoSCoW Prioritization Matrix': path.join(satelliteRoot, '.evolith', 'moscow', 'phase-0.json'),
    'Build-versus-Compose Analysis': path.join(satelliteRoot, '.evolith', 'build-vs-compose.json'),
    'ADR Registry': path.join(satelliteRoot, 'docs', 'architecture', 'adr-matrix.json'),
    'Bounded Context Map': path.join(satelliteRoot, 'docs', 'architecture', 'bounded-context-map.md'),
    'Reference Blueprint Alignment': path.join(satelliteRoot, 'docs', 'architecture', 'reference-blueprint.md'),
    'Simplicity Checklist Phase 1': path.join(satelliteRoot, 'docs', 'architecture', 'simplicity-checklist-phase-01.md'),
    'Test Summary Report': path.join(satelliteRoot, 'docs', 'quality', 'test-summary-report.md'),
    'Release Notes': path.join(satelliteRoot, 'docs', 'releases', 'release-notes.md'),
    'Engineering Manifesto': path.join(satelliteRoot, 'docs', 'engineering-manifesto.md'),
    'SDLC Quality Gates': path.join(satelliteRoot, 'docs', 'quality-gates.md'),
    'Canonical Patterns': path.join(satelliteRoot, 'docs', 'architecture', 'canonical-patterns'),
    'Construction-Focused SDLC Framework': path.join(satelliteRoot, 'docs', 'sdlc-framework.md'),
    'CI Pipeline': path.join(satelliteRoot, '.github', 'workflows'),
    'Definition of Done Checklist': path.join(satelliteRoot, 'docs', 'definition-of-done.md'),
    'Documentation Delta': path.join(satelliteRoot, 'docs', 'documentation-delta'),
    'Coverage Report': path.join(satelliteRoot, 'coverage', 'coverage-summary.json'),
    'Security Scan Report': path.join(satelliteRoot, 'security-scan.json'),
    'Integration Evidence': path.join(satelliteRoot, '.evolith', 'integration-evidence.json'),
    'Acceptance Validation': path.join(satelliteRoot, '.evolith', 'acceptance-validation.json'),
    'Pyramid Distribution': path.join(satelliteRoot, 'coverage', 'coverage-summary.json'),
    'Observability Validation': path.join(satelliteRoot, 'observability'),
    'Rollback Procedure': path.join(satelliteRoot, 'docs', 'releases', 'rollback-procedure.md'),
    'On-Call Handoff': path.join(satelliteRoot, 'docs', 'releases', 'on-call-handoff.md'),
    'Deployment Evidence': path.join(satelliteRoot, '.evolith', 'deployment-evidence.json'),
    'evolith.yaml': path.join(satelliteRoot, 'evolith.yaml'),
    'package.json': path.join(satelliteRoot, 'package.json'),
    'rulesets': path.join(satelliteRoot, 'rulesets'),
    '.harness': path.join(satelliteRoot, '.harness'),
    'src': path.join(satelliteRoot, 'src'),
    'contracts': path.join(satelliteRoot, 'contracts'),
    'Dockerfile': path.join(satelliteRoot, 'Dockerfile'),
  };
}

/**
 * Core template fallback paths for each artifact.
 * Used when no satellite-native path is found and a corePath is available.
 */
export function buildCoreTemplatePaths(corePath: string): Record<string, string> {
  return {
    'PRD': path.join(corePath, 'reference', 'core', 'sdlc', '04-artifact-templates', 'prd-template.md'),
    'Discovery Canvas': path.join(corePath, 'reference', 'core', 'sdlc', '04-artifact-templates', 'discovery-canvas-template.md'),
    'Technical Feasibility Canvas': path.join(corePath, 'reference', 'core', 'sdlc', '04-artifact-templates', 'technical-feasibility-template.md'),
    'Ballpark Estimation': path.join(corePath, 'reference', 'core', 'sdlc', '04-artifact-templates', 'ballpark-estimation-template.md'),
    // GT-632: this was the one straggler among its siblings — missing `core/` AND
    // naming a `.json` that exists in no layout. The registry is the markdown
    // matrix; the template lookup silently found nothing until the guard on built
    // paths reported it.
    'ADR Registry': path.join(corePath, 'reference', 'core', 'architecture', 'adrs', 'adr-matrix.md'),
    'Bounded Context Map': path.join(corePath, 'reference', 'core', 'foundations', 'satellite-definitions', 'bounded-context-map.md'),
    'Reference Blueprint Alignment': path.join(corePath, 'reference', 'core', 'architecture', 'blueprints', 'reference-blueprint.md'),
    'Simplicity Checklist Phase 1': path.join(corePath, 'reference', 'core', 'architecture', 'blueprints', 'simplicity-checklist-phase-01.md'),
    'Test Summary Report': path.join(corePath, 'reference', 'core', 'sdlc', '04-artifact-templates', 'test-summary-report-template.md'),
    'Release Notes': path.join(corePath, 'reference', 'core', 'sdlc', '04-artifact-templates', 'release-notes-template.md'),
    'Engineering Manifesto': path.join(corePath, 'reference', 'core', 'foundations', 'common-rules', 'engineering-manifesto.md'),
    'SDLC Quality Gates': path.join(corePath, 'reference', 'core', 'sdlc', 'quality-gates.md'),
    'Canonical Patterns': path.join(corePath, 'reference', 'core', 'architecture', 'patterns'),
    'Construction-Focused SDLC Framework': path.join(corePath, 'reference', 'core', 'sdlc', '02-engineering', 'construction-focused-sdlc-framework.md'),
    'Definition of Done Checklist': path.join(corePath, 'reference', 'core', 'sdlc', '02-engineering', 'construction-focused-sdlc-framework.md'),
    'Documentation Delta': path.join(corePath, 'reference', 'core', 'sdlc', '03-documentation'),
    'Security Scan Report': path.join(corePath, 'reference', 'core', 'sdlc', '04-artifact-templates', 'security-scan-report-template.md'),
    'Integration Evidence': path.join(corePath, 'reference', 'core', 'sdlc', '04-artifact-templates', 'integration-evidence-template.md'),
    'Observability Validation': path.join(corePath, 'reference', 'core', 'sdlc', '04-artifact-templates', 'observability-validation-template.md'),
    'Rollback Procedure': path.join(corePath, 'reference', 'core', 'sdlc', '04-artifact-templates', 'rollback-rehearsal-template.md'),
    'On-Call Handoff': path.join(corePath, 'reference', 'core', 'sdlc', '04-artifact-templates', 'on-call-handoff-template.md'),
  };
}

/**
 * Resolves the filesystem path for an artifact.
 *
 * Resolution order:
 * 1. Satellite-native path (relative to `satelliteBasePath`). This is the
 *    real artifact the satellite is expected to produce, and it always wins.
 * 2. Core template fallback (relative to `corePath`), used only when the
 *    satellite path is not configured for that artifact AND a `corePath` is
 *    known. When `corePath` is absent this tier is skipped entirely — we
 *    never fabricate a template location.
 * 3. Bare join of `satelliteBasePath` + artifact name as a last resort, which
 *    also covers artifacts named by their literal repo-relative path
 *    (e.g. `README.md`, `.evolith/moscow/phase-0.json`).
 *
 * @param artifact          Logical artifact name (e.g. "PRD", "ADR Registry").
 * @param satelliteBasePath Root of the satellite project being inspected.
 * @param corePath          Optional root of the Evolith Core repository.
 */
export function resolveArtifactPath(
  artifact: string,
  satelliteBasePath: string,
  corePath?: string,
): string {
  const satellitePaths = buildSatelliteArtifactPaths(satelliteBasePath);
  if (satellitePaths[artifact] !== undefined) {
    return satellitePaths[artifact];
  }

  if (corePath) {
    const corePaths = buildCoreTemplatePaths(corePath);
    if (corePaths[artifact] !== undefined) {
      return corePaths[artifact];
    }
  }

  return path.join(satelliteBasePath, artifact);
}
