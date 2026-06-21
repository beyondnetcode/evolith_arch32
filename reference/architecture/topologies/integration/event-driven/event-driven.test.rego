package evolith.topologies.eventdriven_test

import data.evolith.topologies.eventdriven

test_compliant_event_driven_has_no_violations {
  violations := eventdriven.violations with input as {"satellite": {"eventDriven": {"hasStrictAsyncApi": true, "hasOutbox": true, "hasDlq": true}}}
  count(violations) == 0
}

test_missing_asyncapi_is_rejected {
  violations := eventdriven.violations with input as {"satellite": {"eventDriven": {"hasStrictAsyncApi": false, "hasOutbox": true, "hasDlq": true}}}
  violations[_].id == "ED-R01"
}

test_missing_outbox_is_rejected {
  violations := eventdriven.violations with input as {"satellite": {"eventDriven": {"hasStrictAsyncApi": true, "hasOutbox": false, "hasDlq": true}}}
  violations[_].id == "ED-R02"
}

test_missing_dlq_is_rejected {
  violations := eventdriven.violations with input as {"satellite": {"eventDriven": {"hasStrictAsyncApi": true, "hasOutbox": true, "hasDlq": false}}}
  violations[_].id == "ED-R03"
}
