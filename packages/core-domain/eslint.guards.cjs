'use strict';

/**
 * Architecture guards shared between the ESLint flat config (`eslint.config.mjs`)
 * and the regression test (`stateless-core-repository.guard.spec.ts`), so both
 * enforce the EXACT same rule — single source of truth for GT-377 AC-3.
 *
 * CommonJS on purpose: the `.mjs` config imports it statically and the ts-jest
 * (CommonJS) test `require`s it, with no ESM/dynamic-import interop hazard.
 */

/**
 * Bans any identifier shaped like a repository for a business entity that Core
 * treats as pure context (GT-377 / ADR-0101 — Core is a stateless Evaluation
 * Engine). Matches declarations, imports and type references such as
 * `ProductRepository`, `IInitiativeRepository`, `EvidenceRepositoryPort`,
 * `InMemoryDecisionRepository`, … while leaving legitimate infrastructure
 * repositories (`AuditRepository`, `SubscriptionRepository`, `DeliveryRepository`)
 * untouched.
 *
 * @type {{ selector: string, message: string }}
 */
const STATELESS_CORE_REPOSITORY_BAN = {
  selector: 'Identifier[name=/(Product|Initiative|Evidence|Decision)Repository/]',
  message:
    'GT-377/ADR-0101: Core is a stateless Evaluation Engine. product/initiative/evidence/decision are context, not entities — a *Repository for them must not appear in core-domain.',
};

module.exports = { STATELESS_CORE_REPOSITORY_BAN };
