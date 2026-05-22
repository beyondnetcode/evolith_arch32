# Modular Monolith Evolution Playbook

## Use When

- evaluating bounded-context boundaries
- moving shared code
- designing integration flows
- preparing future service extraction

## Mandatory Checks

1. Bounded contexts keep clear ownership.
2. Shared code is truly cross-context, not merely convenient.
3. Domain logic remains pure and framework-agnostic.
4. Cross-context collaboration prefers contracts, ACLs, events, and outbox-friendly patterns.
5. Changes improve, or at least preserve, future extraction readiness.

## Extraction Readiness Questions

- Can this module be separated without copying hidden logic?
- Are contracts explicit enough to become inter-service boundaries later?
- Are we accidentally centralizing domain rules in a shared layer?
