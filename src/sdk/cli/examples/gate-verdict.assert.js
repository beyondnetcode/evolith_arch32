/**
 * GT-572 — the assertion the MCP smoke was missing.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The smoke used to check a `tools/call` like this:
 *
 *     assert(envelope.success !== undefined, 'envelope must have success field');
 *
 * `success` is present on EVERY envelope this server emits, including
 * `{ success: false, error: { code: 'FORBIDDEN' } }` and
 * `{ success: false, error: { code: 'RULESET_NOT_FOUND' } }`. The assertion
 * therefore held for a server that executed nothing at all — which is exactly
 * what was happening: measured on 2026-07-29, the stdio smoke received
 * `RULESET_NOT_FOUND` from `evolith-gate-evaluate` and printed
 * `tools/call OK (evolith-gate-evaluate stdio)`. An assertion that cannot fail is
 * not a weak test, it is an absent one, and it is the defect this file fixes.
 *
 * WHAT A PASS NOW REQUIRES
 * ------------------------
 * A GOVERNANCE VERDICT — the tool ran, evaluated a gate, and returned its
 * judgement. Not a field, not a shape, not an exit code:
 *
 *   1. the JSON-RPC result is not flagged `isError`;
 *   2. the envelope is `success: true` — a denial or an I/O failure fails here,
 *      and the denial's own message is surfaced so the failure is diagnosable;
 *   3. the call was not refused by ABAC (`FORBIDDEN`), called out separately
 *      because that is GT-572's original symptom: 47 tools announced, 47 denied;
 *   4. `data.verdict` is one of the vocabulary's values;
 *   5. `data.gateId` names the gate that was actually evaluated.
 *
 * Exported as its own module, rather than inlined in mcp-test.js, so its failure
 * modes can be unit-tested (gate-verdict.assert.test.mjs). A gate whose own
 * ability to fail is untested is how this repository got here.
 */

'use strict';

/**
 * Legacy gate-evidence vocabulary, which is what `evolith-gate-evaluate` emits
 * (`GateEvidence.verdict` in core-domain). The canonical enum introduced by
 * GT-316 — PASS/FAIL/WAIVE/SKIP — is accepted too, so this gate does not become
 * the thing that breaks when the tool migrates to it.
 */
const GATE_VERDICTS = Object.freeze([
  'passed', 'failed', 'skipped',
  'PASS', 'FAIL', 'WAIVE', 'SKIP',
]);

/** Error carrying the observed payload, so a CI log shows what came back. */
class GateVerdictAssertionError extends Error {
  constructor(message, observed) {
    super(message);
    this.name = 'GateVerdictAssertionError';
    this.observed = observed;
  }
}

/**
 * Assert that a `tools/call` on a gate-evaluating tool produced a real verdict.
 *
 * @param {object} result   the JSON-RPC `result` object of the tools/call
 * @param {string} label    transport/tool identification for the message
 * @returns {{verdict: string, gateId: string, summary: object|undefined}}
 * @throws {GateVerdictAssertionError} when anything short of a verdict came back
 */
function assertGateVerdict(result, label) {
  const where = `${label}: `;

  if (!result || typeof result !== 'object') {
    throw new GateVerdictAssertionError(`${where}no result object in the tools/call response`, result);
  }
  if (!Array.isArray(result.content) || result.content.length === 0) {
    throw new GateVerdictAssertionError(`${where}result.content is not a non-empty array`, result);
  }

  const text = result.content[0] && result.content[0].text;
  if (typeof text !== 'string') {
    throw new GateVerdictAssertionError(`${where}result.content[0].text is not a string`, result.content[0]);
  }

  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch (err) {
    throw new GateVerdictAssertionError(`${where}content[0].text is not JSON — ${err.message}`, text);
  }

  const code = envelope && envelope.error && envelope.error.code;
  const detail = (envelope && envelope.error && envelope.error.message) || '(no message)';

  // Called out before the generic success check: FORBIDDEN is GT-572's symptom,
  // and reading "success was false" would bury it.
  if (code === 'FORBIDDEN') {
    throw new GateVerdictAssertionError(
      `${where}the call was DENIED by ABAC (FORBIDDEN) — the server announced the tool and refused to run it. ${detail}`,
      envelope,
    );
  }

  if (result.isError === true) {
    throw new GateVerdictAssertionError(`${where}the server flagged the result isError — ${detail}`, envelope);
  }

  if (envelope.success !== true) {
    throw new GateVerdictAssertionError(
      `${where}no verdict was produced: success=${JSON.stringify(envelope.success)} `
      + `code=${JSON.stringify(code)} — ${detail}`,
      envelope,
    );
  }

  const data = envelope.data;
  if (!data || typeof data !== 'object') {
    throw new GateVerdictAssertionError(`${where}envelope.data is missing`, envelope);
  }
  if (!GATE_VERDICTS.includes(data.verdict)) {
    throw new GateVerdictAssertionError(
      `${where}data.verdict is ${JSON.stringify(data.verdict)}, expected one of ${GATE_VERDICTS.join('|')}`,
      envelope,
    );
  }
  if (typeof data.gateId !== 'string' || data.gateId.length === 0) {
    throw new GateVerdictAssertionError(
      `${where}data.gateId is missing — a verdict must name the gate it judged`,
      envelope,
    );
  }

  return { verdict: data.verdict, gateId: data.gateId, summary: data.summary };
}

module.exports = { assertGateVerdict, GateVerdictAssertionError, GATE_VERDICTS };
