/**
 * Blueprint entity and builder (GT-325).
 *
 * A Blueprint is the authoritative description of what rulesets, topologies,
 * gates, and policies apply to a satellite project at a given SDLC phase.
 * It moves through the ArtifactState lifecycle (DRAFT → VALIDATED) and carries
 * a full history of verdicts.
 */

import { ArtifactState } from '../lifecycle/artifact-state-machine';
import { VerdictRecord } from '../verdict/verdict';

// ---------------------------------------------------------------------------
// Value objects
// ---------------------------------------------------------------------------

/**
 * The structural content of a Blueprint — what it governs.
 */
export interface BlueprintContent {
  /** List of ruleset identifiers (relative paths from repo root, e.g. "rulesets/governance"). */
  rulesets: string[];
  /** Topology identifier (must exist in rulesets/topologies/). */
  topologyId: string;
  /** Gate identifiers that apply to this blueprint (e.g. "gate-f1", "gate-f2"). */
  gateIds: string[];
  /** Artifacts this blueprint requires to be present in the satellite. */
  requiredArtifacts: string[];
  /** Optional OPA policy files to enforce in addition to built-in rules. */
  customPolicies?: string[];
}

// ---------------------------------------------------------------------------
// Blueprint entity
// ---------------------------------------------------------------------------

export interface Blueprint {
  readonly id: string;
  readonly tenantId: string;
  readonly topology: string;
  readonly phase: string;
  readonly version: string;
  readonly createdAt: string;
  state: ArtifactState;
  readonly content: BlueprintContent;
  readonly verdictHistory: VerdictRecord[];
}

// ---------------------------------------------------------------------------
// BlueprintBuilder — fluent builder
// ---------------------------------------------------------------------------

export class BlueprintBuilder {
  private _id: string = `bp-${Date.now().toString(36)}`;
  private _tenantId: string = '';
  private _topology: string = '';
  private _phase: string = '';
  private _version: string = '1.0.0';
  private _rulesets: string[] = [];
  private _gateIds: string[] = [];
  private _requiredArtifacts: string[] = [];
  private _customPolicies?: string[];

  setId(id: string): this {
    this._id = id;
    return this;
  }

  setTenantId(tenantId: string): this {
    this._tenantId = tenantId;
    return this;
  }

  setTopology(topology: string): this {
    this._topology = topology;
    return this;
  }

  setPhase(phase: string): this {
    this._phase = phase;
    return this;
  }

  setVersion(version: string): this {
    this._version = version;
    return this;
  }

  addRuleset(ruleset: string): this {
    this._rulesets.push(ruleset);
    return this;
  }

  addGate(gateId: string): this {
    this._gateIds.push(gateId);
    return this;
  }

  addRequiredArtifact(artifact: string): this {
    this._requiredArtifacts.push(artifact);
    return this;
  }

  addCustomPolicy(policy: string): this {
    if (!this._customPolicies) this._customPolicies = [];
    this._customPolicies.push(policy);
    return this;
  }

  build(): Blueprint {
    if (!this._tenantId) throw new Error('BlueprintBuilder: tenantId is required');
    if (!this._topology) throw new Error('BlueprintBuilder: topology is required');
    if (!this._phase) throw new Error('BlueprintBuilder: phase is required');

    const content: BlueprintContent = {
      rulesets: [...this._rulesets],
      topologyId: this._topology,
      gateIds: [...this._gateIds],
      requiredArtifacts: [...this._requiredArtifacts],
      ...(this._customPolicies ? { customPolicies: [...this._customPolicies] } : {}),
    };

    return {
      id: this._id,
      tenantId: this._tenantId,
      topology: this._topology,
      phase: this._phase,
      version: this._version,
      createdAt: new Date().toISOString(),
      state: ArtifactState.DRAFT,
      content,
      verdictHistory: [],
    };
  }
}
