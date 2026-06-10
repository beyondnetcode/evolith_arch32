# [ADR 0020](0020-identity-provider-abstraction-strategy.md): Identity Provider Abstraction Strategy

## Status
Approved

## Date
2026-05-09

## Context
Enterprise authentication needs migrate, shift, and fragment over time. Tying system internals direct to vendor SDKs (e.g., Zitadel, Okta) causes total lock-in and leaves the platform incapable of answering air-gapped deployment needs, SAML requirements from external corporate hubs, or standard internal legacy hashing flows.

## Decision
Separate credential verification from the business layer via polymorphic **Strategy injection** secured by a local Hexagonal interface (`IAuthenticationPort`):

1. **Zero Lock-in**: The core core trusts a single validation Port logic. It cares only if credentials resolve to a verified user vector.
2. **Dynamic Execution**: The resolver activates correct concrete Adapters at runtime (via `Tenant` configuration flags) feeding off of:
 - Local Store (Bcrypt storage)
 - Enterprise Identity Providers (Cognito, Azure AD, Okta, Zitadel, Auth0)
 - General federated endpoints (OIDC/SAML)
3. **Progressive Security**: Wire current protocols supporting Modern Standards (Passkeys, MFA, WebAuthn) natively into the abstracted provider pool.

## Consequences

### Positive
- High deployment fluidity. Deploy same code inside Azure cloud or within private disconnected local hardware.
- Clients retain sovereignty: each enterprise Tenant may configure and point towards their own respective company AD/SAML.

### Negative
- Increases initialization factory complexity required to correctly instantiate correct credential drivers based on runtime host context.

## References
- [ADR-0026: MFA and Passwordless](../../adrs/nodejs/0026-mfa-passwordless-adaptive-authentication.md)
- [ADR-0002: Clean Hexagonal Architecture](../../adrs/nodejs/0002-clean-architecture-nestjs.md)





## Objective and Scope

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Options Considered

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to Index](./README.md)
