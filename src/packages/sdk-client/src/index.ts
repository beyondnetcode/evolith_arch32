/**
 * @beyondnet/evolith-sdk — Typed client library for the Evolith Core REST API and MCP tools.
 *
 * @example REST
 * ```ts
 * import { EvolithRestClient } from '@beyondnet/evolith-sdk';
 *
 * const client = new EvolithRestClient({ baseUrl: 'http://localhost:3000', apiKey: 'token' });
 * const result = await client.evaluatePhaseGate('discovery', { workspaceRef: 'op_abc123' });
 * ```
 *
 * @example MCP
 * ```ts
 * import { EvolithMcpClient, createJsonRpcTransport } from '@beyondnet/evolith-sdk';
 *
 * const mcp = new EvolithMcpClient({ transport: createJsonRpcTransport(myRpcFn) });
 * const gate = await mcp.evaluateGate({ phase: 'discovery', projectPath: '/repos/my-service' });
 * ```
 */

// REST surface
export { EvolithRestClient, EvolithApiError } from './rest/evolith-rest-client.js';
export type { EvolithRestClientOptions } from './rest/evolith-rest-client.js';
export { AgentClient } from './rest/agent.client.js';
export type {
  ApiEnvelope,
  SuccessEnvelope,
  ErrorEnvelope,
  EnvelopeMeta,
  GatePhase as RestGatePhase,
  EvaluateGateRequest,
  EvaluateGateResponse,
  GateEvidence,
  GateVerdict,
  GateViolation as RestGateViolation,
  ViolationSeverity,
  EvaluatorKind as RestEvaluatorKind,
  TransitionPhaseRequest,
  TransitionPhaseResponse,
  PhaseTransitionResult,
  TopologyManifest as RestTopologyManifest,
  ListTopologiesResponse,
  GetTopologyResponse,
  ValidateSatelliteRequest,
  ValidateSatelliteResponse,
  DetectDriftRequest,
  DetectDriftResponse,
  ValidationResult,
  InitProjectRequest,
  InitProjectResponse,
  ProposeAdvanceRequest,
  ProposeAdvanceResponse,
} from './rest/types.js';

// Agent Runtime surface — the wire types of `EvolithRestClient#agent`, so the
// public property is nameable by consumers (GT-564).
export type { AgentRuntimeRequestWire, AgentRuntimeResult } from '@beyondnet/evolith-agent-runtime';

// Satellites surface
export { SatellitesClient } from './satellites.client.js';
export type {
  SatelliteRecord,
  SatelliteStatus,
  SatelliteMode,
  SatelliteTopology,
  InitializeSatelliteInput,
  RegisterSatelliteInput,
} from './satellites.client.js';

// MCP surface
export { EvolithMcpClient, createJsonRpcTransport } from './mcp/evolith-mcp-client.js';
export type { EvolithMcpClientOptions, McpTransport, McpCallResult } from './mcp/evolith-mcp-client.js';
export type {
  GatePhase as McpGatePhase,
  EvaluatorKind,
  EvidenceMode,
  ValidateFormat,
  GateEvaluateInput,
  GateEvaluateOutput,
  GateViolation as McpGateViolation,
  ValidateInput,
  ValidateOutput,
  ValidateJsonOutput,
  ValidationIssue,
  PhaseAdvanceInput,
  PhaseAdvanceOutput,
  TopologyListInput,
  TopologyListOutput,
  TopologyGetInput,
  TopologyGetOutput,
  TopologyManifest as McpTopologyManifest,
  McpToolName,
  McpToolInputMap,
  McpToolOutputMap,
} from './mcp/types.js';
