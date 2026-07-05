/**
 * GT-317 — Composable SDLC catalog.
 *
 * Loads phase / gate / artifact definitions from the reference data files under
 * `reference/governance/sdlc/`.  No tenant state is stored here — all data
 * is read-only and derived from the canonical Core data files.
 */

import * as path from 'path';
import * as fs from 'fs';
import { WorkflowPhaseDefinition, WorkflowGateDefinition } from '../../domain/workflow';

// ---------------------------------------------------------------------------
// Raw shapes that mirror the JSON files on disk
// ---------------------------------------------------------------------------

interface RawArtifact {
  artifact: string;
  schemaRef?: string;
  validation: string;
  rules: string[];
}

interface RawGate {
  id: string;
  name: string;
  phase: string;
  description: string;
  accountableRole?: string;
  requiredArtifacts: RawArtifact[];
  blockingCriteria?: { criterion: string; action: string }[];
}

interface RawPhase {
  id: string;
  name: string;
  shortName: string;
  order: number;
  description: string;
  gates: string[];
}

// ---------------------------------------------------------------------------
// CatalogService
// ---------------------------------------------------------------------------

/**
 * Exposes read-only catalogs of phases, gates, and artifact names.
 * The `corePath` is the absolute path to the repository root (where
 * `reference/governance/sdlc/` lives).
 */
export class CatalogService {
  private readonly sdlcDir: string;

  constructor(corePath: string) {
    this.sdlcDir = path.join(corePath, 'reference', 'governance', 'sdlc');
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Returns all SDLC phases (F1–F5) with their gates fully populated. */
  getPhases(): WorkflowPhaseDefinition[] {
    const rawPhases = this.loadAllPhases();
    return rawPhases.map(rp => ({
      id: rp.id,
      name: rp.name,
      order: rp.order,
      gates: rp.gates.map(gid => this.loadGate(gid)),
    }));
  }

  /** Returns the gates for a specific phase id (e.g. "f1"). */
  getGates(phaseId: string): WorkflowGateDefinition[] {
    const rawPhase = this.loadAllPhases().find(p => p.id === phaseId);
    if (!rawPhase) {
      return [];
    }
    return rawPhase.gates.map(gid => this.loadGate(gid));
  }

  /** Returns the artifact names required by a specific gate id (e.g. "gate-f1"). */
  getArtifacts(gateId: string): string[] {
    const gate = this.loadGate(gateId);
    return gate.requiredArtifacts;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private loadAllPhases(): RawPhase[] {
    const dir = path.join(this.sdlcDir, 'phases');
    const files = fs
      .readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .sort();
    return files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as RawPhase);
  }

  private loadGate(gateId: string): WorkflowGateDefinition {
    const filePath = path.join(this.sdlcDir, 'gates', `${gateId}.json`);
    const raw: RawGate = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return {
      id: raw.id,
      name: raw.name,
      requiredArtifacts: raw.requiredArtifacts.map(a => a.artifact),
      rules: [...new Set(raw.requiredArtifacts.flatMap(a => a.rules))],
      accountableRole: raw.accountableRole,
    };
  }
}
