/**
 * ICommunicationGatewayPort — adapts an external conversation surface (CLI,
 * chat, webhook) to the runtime contract. INBOUND it parses a raw message into
 * an {@link AgentRuntimeRequest}; OUTBOUND it renders an {@link AgentRuntimeResult}
 * back for that surface. Keeping this a port means a Slack bot, a REST endpoint,
 * or the CLI are all just adapters.
 */

import type { AgentRuntimeRequest } from '../contracts/agent-runtime-request';
import type { AgentRuntimeResult } from '../contracts/agent-runtime-result';

export interface ICommunicationGatewayPort {
  /** Parse a raw inbound message/payload into a runtime request. */
  parse(raw: unknown): Promise<AgentRuntimeRequest>;
  /** Render a result for the surface (e.g. a CLI string or chat blocks). */
  present(result: AgentRuntimeResult): Promise<string>;
}
