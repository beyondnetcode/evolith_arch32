/**
 * @beyondnet/evolith-contracts — the versioned, self-contained SemVer boundary
 * for the Evolith Core public contract (GT-513 · EAG-06).
 *
 * External (non-Tracker) consumers depend on THIS package — not on the Core
 * engine — to discover, at a pinned SemVer + sha256, what the stateless Core
 * can evaluate:
 *
 *  - the machine-contract / schema set ({@link MACHINE_CONTRACT_SET},
 *    {@link CONTRACT_SET_SHA256}) — now advertising a first-class `external`
 *    consumer, closing the single-consumer gap of the raw
 *    `evolith-machine-contracts.json`; and
 *  - the capability manifest contract ({@link EXPECTED_CAPABILITY_MANIFEST})
 *    served live by `GET /api/v1/capabilities`.
 *
 * Contract-parity tests bind this package to the live endpoints and FAIL on any
 * drift, so a Core capability change cannot ship without a package/SemVer bump.
 *
 * @example
 * ```ts
 * import {
 *   CONTRACTS_PACKAGE_VERSION,
 *   EXPECTED_CAPABILITY_MANIFEST,
 *   checkCapabilityManifestParity,
 * } from '@beyondnet/evolith-contracts';
 *
 * const live = await fetch(`${base}/api/v1/capabilities`)
 *   .then((r) => r.json())
 *   .then((env) => env.data);
 * const { ok, mismatches } = checkCapabilityManifestParity(live);
 * if (!ok) throw new Error(`Core drifted from contract ${CONTRACTS_PACKAGE_VERSION}: ${mismatches}`);
 * ```
 */

export {
  CONTRACTS_PACKAGE_VERSION,
  CONTRACT_SET_SHA256,
  MACHINE_CONTRACT_SET,
  SUPPORTED_CONSUMER_IDS,
  contractSetFingerprint,
  type ContractSchemaDescriptor,
  type MachineContractSet,
  type SupportedConsumer,
} from './schemas/machine-contract-set';

export { canonicalJson, sha256Hex, sortDeep } from './schemas/contract-hash';

export {
  // GT-573 — pinnable evaluate request/response pairs + the consumer oracle.
  TRACKER_BOUND_RESULT_KEYS,
  TRACKER_BOUND_GATE_KEYS,
  TRACKER_BOUND_GAP_KEYS,
  TRACKER_UNCONTRACTED_FIELDS,
  EVALUATE_INLINE_PASS_REQUEST,
  EVALUATE_INLINE_FAIL_REQUEST,
  EVALUATE_INLINE_OPA_GATE_FAIL_REQUEST,
  EVALUATION_RESULT_PASS_FIXTURE,
  EVALUATION_RESULT_FAIL_FIXTURE,
  EVALUATION_RESULT_OPA_GATE_FAIL_FIXTURE,
  EVALUATE_INLINE_ATTRIBUTED_REQUEST,
  EVALUATION_RESULT_ATTRIBUTION_FIXTURE,
  LEGACY_INLINE_ENVELOPE_FIXTURE,
  assertFixtureCongruence,
  assertTrackerEvaluationContract,
  checkFixtureCongruence,
  checkTrackerEvaluationContract,
  normalizeGateVerdict,
  trackerDecisionFrom,
  type ContractCheckResult,
  type TrackerBoundEvaluationResult,
  type TrackerBoundGap,
  type TrackerBoundGate,
  type TrackerDecision,
} from './fixtures/evaluation-contract.fixtures';

export {
  // GT-605 — the single typed evidence-edge model both sides converge on.
  EVIDENCE_NODE_KINDS,
  EVIDENCE_REF_SCHEME,
  CORE_NATIVE_EDGE_TYPES,
  EVIDENCE_EDGE_TYPES,
  EVIDENCE_EDGE_SEMANTICS,
  EVIDENCE_GRAPH_QUERIES,
  EVIDENCE_EDGE_STORAGE_CONTRACT,
  edgesFromLegacyReferences,
  evidenceEdgeKey,
  formatEvidenceRef,
  invertEdge,
  isEvidenceEdgeType,
  isEvidenceNodeKind,
  parseEvidenceRef,
  sameEvidenceNode,
  traverseEvidenceGraph,
  type EvidenceEdge,
  type EvidenceEdgeColumnSpec,
  type EvidenceEdgeType,
  type EvidenceGraphQuery,
  type EvidenceNodeKind,
  type EvidenceNodeRef,
  type LegacyReferenceMapping,
  type TraversalDirection,
  type TraversalHit,
  type TraversalOptions,
} from './evidence/evidence-edge';

export {
  EXPECTED_CAPABILITY_MANIFEST,
  assertCapabilityManifestParity,
  capabilityManifestFingerprint,
  checkCapabilityManifestParity,
  type CapabilityManifestShape,
  type ManifestParityResult,
} from './capabilities/capability-contract';
