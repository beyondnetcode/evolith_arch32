package evolith.topologies.eventdriven_test

import data.evolith.topologies.eventdriven

# --- Baseline rules (ED-R01–R03) ---

test_compliant_event_driven_has_no_violations {
  violations := eventdriven.violations with input as {"satellite": {"eventDriven": {
    "hasStrictAsyncApi": true, "hasOutbox": true, "hasDlq": true,
    "hasOrderingGuarantee": true, "hasIdempotencyKey": true,
    "hasBackwardCompatibleSchema": true, "hasRetentionPolicy": true,
    "hasEventCorrelation": true, "hasConsumerGroupRegistry": true
  }}}
  count(violations) == 0
}

test_missing_asyncapi_is_rejected {
  violations := eventdriven.violations with input as {"satellite": {"eventDriven": {
    "hasStrictAsyncApi": false, "hasOutbox": true, "hasDlq": true,
    "hasOrderingGuarantee": true, "hasIdempotencyKey": true,
    "hasBackwardCompatibleSchema": true, "hasRetentionPolicy": true,
    "hasEventCorrelation": true, "hasConsumerGroupRegistry": true
  }}}
  violations[_].id == "ED-R01"
}

test_missing_outbox_is_rejected {
  violations := eventdriven.violations with input as {"satellite": {"eventDriven": {
    "hasStrictAsyncApi": true, "hasOutbox": false, "hasDlq": true,
    "hasOrderingGuarantee": true, "hasIdempotencyKey": true,
    "hasBackwardCompatibleSchema": true, "hasRetentionPolicy": true,
    "hasEventCorrelation": true, "hasConsumerGroupRegistry": true
  }}}
  violations[_].id == "ED-R02"
}

test_missing_dlq_is_rejected {
  violations := eventdriven.violations with input as {"satellite": {"eventDriven": {
    "hasStrictAsyncApi": true, "hasOutbox": true, "hasDlq": false,
    "hasOrderingGuarantee": true, "hasIdempotencyKey": true,
    "hasBackwardCompatibleSchema": true, "hasRetentionPolicy": true,
    "hasEventCorrelation": true, "hasConsumerGroupRegistry": true
  }}}
  violations[_].id == "ED-R03"
}

# --- New rules (ED-R04–R09) ---

test_missing_ordering_guarantee_is_rejected {
  violations := eventdriven.violations with input as {"satellite": {"eventDriven": {
    "hasStrictAsyncApi": true, "hasOutbox": true, "hasDlq": true,
    "hasOrderingGuarantee": false, "hasIdempotencyKey": true,
    "hasBackwardCompatibleSchema": true, "hasRetentionPolicy": true,
    "hasEventCorrelation": true, "hasConsumerGroupRegistry": true
  }}}
  violations[_].id == "ED-R04"
}

test_missing_idempotency_key_is_rejected {
  violations := eventdriven.violations with input as {"satellite": {"eventDriven": {
    "hasStrictAsyncApi": true, "hasOutbox": true, "hasDlq": true,
    "hasOrderingGuarantee": true, "hasIdempotencyKey": false,
    "hasBackwardCompatibleSchema": true, "hasRetentionPolicy": true,
    "hasEventCorrelation": true, "hasConsumerGroupRegistry": true
  }}}
  violations[_].id == "ED-R05"
}

test_missing_backward_compatible_schema_is_rejected {
  violations := eventdriven.violations with input as {"satellite": {"eventDriven": {
    "hasStrictAsyncApi": true, "hasOutbox": true, "hasDlq": true,
    "hasOrderingGuarantee": true, "hasIdempotencyKey": true,
    "hasBackwardCompatibleSchema": false, "hasRetentionPolicy": true,
    "hasEventCorrelation": true, "hasConsumerGroupRegistry": true
  }}}
  violations[_].id == "ED-R06"
}

test_missing_retention_policy_is_flagged {
  violations := eventdriven.violations with input as {"satellite": {"eventDriven": {
    "hasStrictAsyncApi": true, "hasOutbox": true, "hasDlq": true,
    "hasOrderingGuarantee": true, "hasIdempotencyKey": true,
    "hasBackwardCompatibleSchema": true, "hasRetentionPolicy": false,
    "hasEventCorrelation": true, "hasConsumerGroupRegistry": true
  }}}
  violations[_].id == "ED-R07"
}

test_missing_event_correlation_is_flagged {
  violations := eventdriven.violations with input as {"satellite": {"eventDriven": {
    "hasStrictAsyncApi": true, "hasOutbox": true, "hasDlq": true,
    "hasOrderingGuarantee": true, "hasIdempotencyKey": true,
    "hasBackwardCompatibleSchema": true, "hasRetentionPolicy": true,
    "hasEventCorrelation": false, "hasConsumerGroupRegistry": true
  }}}
  violations[_].id == "ED-R08"
}

test_missing_consumer_group_registry_is_flagged {
  violations := eventdriven.violations with input as {"satellite": {"eventDriven": {
    "hasStrictAsyncApi": true, "hasOutbox": true, "hasDlq": true,
    "hasOrderingGuarantee": true, "hasIdempotencyKey": true,
    "hasBackwardCompatibleSchema": true, "hasRetentionPolicy": true,
    "hasEventCorrelation": true, "hasConsumerGroupRegistry": false
  }}}
  violations[_].id == "ED-R09"
}
