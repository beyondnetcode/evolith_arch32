/**
 * CliCommunicationGatewayAdapter — adapts a CLI/chat surface to the runtime
 * contract ({@link ICommunicationGatewayPort}).
 *
 * INBOUND it accepts either:
 *  - a structured wire object (`{ intent, tenant, ... }`), or
 *  - a one-line command string:
 *      `<intent-or-tool> tenant=acme product=tracker gate=prd_readiness foo=bar`
 *    where well-known keys map to context and the rest become `parameters`.
 *
 * OUTBOUND it renders a human-readable summary for a terminal/chat reply. A REST
 * endpoint or a Slack bot are sibling adapters over the same port.
 */

import type { ICommunicationGatewayPort } from '../../domain/ports/communication-gateway.port';
import type { AgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import type { AgentRuntimeResult } from '../../domain/contracts/agent-runtime-result';
import {
  parseAgentRuntimeRequest,
  type AgentRuntimeRequestWire,
} from '../../domain/contracts/agent-runtime-request';

const CONTEXT_KEYS = new Set([
  'tenant', 'product', 'initiative', 'phase', 'gate', 'requested_by', 'tool', 'runtime', 'correlation_id',
]);

export class CliCommunicationGatewayAdapter implements ICommunicationGatewayPort {
  async parse(raw: unknown): Promise<AgentRuntimeRequest> {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return parseAgentRuntimeRequest(raw as AgentRuntimeRequestWire);
    }
    if (typeof raw === 'string') {
      return parseAgentRuntimeRequest(this.parseLine(raw));
    }
    throw new TypeError('CLI gateway expects a wire object or a command string.');
  }

  private parseLine(line: string): AgentRuntimeRequestWire {
    const tokens = line.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) throw new TypeError('Empty command.');

    const head = tokens[0];
    const wire: Record<string, unknown> = {};
    const parameters: Record<string, unknown> = {};

    // The head is treated as both the intent AND an explicit tool candidate;
    // the SkillRegistry resolves whichever matches.
    wire.intent = head.replace(/-/g, '_');
    wire.tool = head;

    for (const token of tokens.slice(1)) {
      const eq = token.indexOf('=');
      if (eq === -1) continue;
      const key = token.slice(0, eq);
      const value = this.coerce(token.slice(eq + 1));
      if (CONTEXT_KEYS.has(key)) wire[key] = value;
      else parameters[key] = value;
    }

    if (Object.keys(parameters).length > 0) wire.parameters = parameters;
    return wire as unknown as AgentRuntimeRequestWire;
  }

  /** Coerce CLI scalars: comma lists → arrays, true/false → boolean, digits → number. */
  private coerce(value: string): unknown {
    if (value.includes(',')) return value.split(',').map((v) => v.trim()).filter(Boolean);
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^-?\d+$/.test(value)) return Number(value);
    return value;
  }

  async present(result: AgentRuntimeResult): Promise<string> {
    const icon = { passed: '✓', warning: '!', blocked: '⛔', error: '✗' }[result.status];
    const lines: string[] = [
      `${icon} [${result.status.toUpperCase()}] ${result.summary}`,
      `  capability : ${result.trace.capability ?? '(none)'}`,
      `  trace      : executed_by=${result.trace.executedBy} validated_by=${result.trace.validatedBy ?? '-'} governed_by=${result.trace.governedBy ?? '-'} policy_engine=${result.trace.policyEngine ?? '-'}`,
    ];
    if (result.findings.length > 0) {
      lines.push('  findings   :');
      for (const f of result.findings) lines.push(`    - [${f.severity}] ${f.message}`);
    }
    if (result.missingArtifacts.length > 0) {
      lines.push(`  missing    : ${result.missingArtifacts.join(', ')}`);
    }
    if (result.recommendations.length > 0) {
      lines.push('  recommend  :');
      for (const r of result.recommendations) lines.push(`    - ${r.message}`);
    }
    return lines.join('\n');
  }
}
