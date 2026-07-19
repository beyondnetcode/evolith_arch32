# [ADR 0026](0026-mfa-passwordless-adaptive-authentication.md): Adaptive MFA and Passwordless Platform

## Status
Accepted

## Date
2026-05-09

## Context
Conventional password validation and raw static SMS MFA is heavily vulnerable to aggressive social engineering and phishing vectors. Enterprise clients demand Zero-Trust compliance, requiring phishing-resistant cryptographic mechanisms alongside frictionless experiences that do not exhaust end-users.

## Decision
Rollout an **Adaptive Risk-Managed MFA Framework** driving the Core authentication pipeline:

1. **Passwordless First**: Infuse native WebAuthn (Passkeys) into authentication flows, empowering end-users to bind high-security hardware (TouchID, FaceID, Yubikeys) natively to logins.
2. **Adaptive Scoring**: Deploy stateless pipeline checkpoints inspecting metadata (IP vectors, fingerprint anomalies, location impossible-travel checks). Produce internal risk matrices.
3. **Dynamic Step-Up**: Move away from "always on" frictions. Trigger multi-factor requests dynamically only upon risk score threshold violations or requests touching critical business critical transactional paths.
4. **Tenant Governance**: Allow each enterprise Tenant profile to activate, configure, and mandate their exact preferred security posture threshold.

## Consequences

### Positive
- Establishes best-in-class Anti-Phishing defense matching strict NIST SP 800-63B standards.
- Dramatically lifts operator throughput by reducing redundant validation fatigue on secure, established device vectors.

### Negative
- Initial onboarding learning curvature for non-technical operator demographics.
- Minimal cryptography processing overhead required per login.

## References
- [ADR-0020: IdP Abstraction](../../adrs/core/0020-identity-provider-abstraction-strategy.md)
- [WebAuthn Official Guide](https://webauthn.guide/)







## Objective and Scope

Historical backfill: Address the architectural tension where conventional password validation and raw static SMS MFA is heavily vulnerable to aggressive social engineering and phishing vectors, establishing a standard boundary.

## Options Considered

- **Selected:** Adaptive MFA and Passwordless Platform
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0020: IdP Abstraction](../../adrs/core/0020-identity-provider-abstraction-strategy.md)
- [WebAuthn Official Guide](https://webauthn.guide/)

## Technology Watch (Trends, Maturity, Adoption, Support)

MFA, passwordless, and adaptive authentication are in the growth-to-mainstream adoption stage with strong industry momentum. FIDO2/WebAuthn standards have mature browser support and are increasingly mandated by enterprise security policies. The market includes major vendors (Microsoft, Okta, Auth0) and open-source solutions. Regulatory pressure (PSD2, GDPR, SOX) drives continued adoption. Expected vigencia: 3-5 years for specific implementations; the MFA/passwordless pattern is a permanent security requirement.

## Current Sources

- FIDO2/WebAuthn specification — https://webauthn.io, consulted 2026-06-20.
- OWASP authentication guidelines — https://cheatsheetseries.owasp.org, consulted 2026-06-20.
- Microsoft passwordless authentication documentation — https://www.microsoft.com/en-us/security/business/identity-access-management/passwordless, consulted 2026-06-20.

---
[Back to Index](./README.md)
