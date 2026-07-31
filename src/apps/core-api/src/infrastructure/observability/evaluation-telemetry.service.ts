/**
 * Attaches `gen_ai.evaluation.result` events to the request span (GT-587).
 *
 * The Core is pure and owns no span: `toGenAiEvaluationEvents` is a total function from
 * an `EvaluationResult` to a list of `{name, attributes}` records, and THIS is the
 * adapter that hands them to OpenTelemetry. That split is the whole reason the mapping
 * is unit-testable without an SDK, and the reason rule HXA-05 (observability SDK inside
 * the domain/application layer) is not tripped by the vocabulary living in core-domain.
 *
 * The span is the ambient one the auto-instrumented HTTP/Express layer already created,
 * so the evaluation outcome lands on the same trace as the request that asked for it —
 * which is what makes the signal joinable at all. When tracing is off (`OTEL_ENABLED`
 * unset outside production) there is no active span and this is a no-op: emitting is a
 * side channel, never a precondition of answering the request.
 */

import { Injectable } from '@nestjs/common';
import { trace, type Span } from '@opentelemetry/api';
import { toGenAiEvaluationEvents } from '@beyondnet/evolith-core-domain/evaluation';
import type { EvaluationResult } from '@beyondnet/evolith-core-domain/evaluation';

@Injectable()
export class EvaluationTelemetryService {
  /**
   * Emit one `gen_ai.evaluation.result` event per evaluated kind onto the active span.
   *
   * @returns how many events were emitted — 0 when no span is recording. Returned
   *   rather than voided so a test can distinguish "emitted nothing" from "did not run",
   *   the same distinction the harness's zero-coverage guardrail exists for.
   */
  record(result: EvaluationResult, span: Span | undefined = trace.getActiveSpan()): number {
    if (!span) return 0;
    const events = toGenAiEvaluationEvents(result);
    for (const event of events) {
      span.addEvent(event.name, { ...event.attributes });
    }
    return events.length;
  }
}
