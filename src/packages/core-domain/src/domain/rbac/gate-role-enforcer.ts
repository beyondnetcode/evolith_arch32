import { Role, gateRoleFromString, hasAnyRole } from './role';
import { GateAuthorizationError } from '../errors/gate-authorization.error';

/**
 * Enforces that the actor requesting a gate PASS or WAIVE verdict holds the
 * role declared in the gate JSON's `accountableRole` / `waiverAuthority`
 * fields (GT-320).
 */
export class GateRoleEnforcer {
  /**
   * Returns true when the actor is allowed to approve (PASS) the gate.
   *
   * - If no `accountableRole` is set the gate is open — any actor may approve.
   * - Otherwise the actor must hold the required role (directly or via hierarchy).
   */
  canApprove(actorRoles: Role[], gate: { accountableRole?: string }): boolean {
    if (!gate.accountableRole) return true;
    const required = gateRoleFromString(gate.accountableRole);
    if (required === undefined) return true; // unknown role string → open
    return hasAnyRole(actorRoles, [required]);
  }

  /**
   * Returns true when the actor is allowed to waive the gate.
   *
   * - If no `waiverAuthority` is set the gate is open — any actor may waive.
   * - Otherwise the actor must hold the required role (directly or via hierarchy).
   */
  canWaive(actorRoles: Role[], gate: { waiverAuthority?: string }): boolean {
    if (!gate.waiverAuthority) return true;
    const required = gateRoleFromString(gate.waiverAuthority);
    if (required === undefined) return true; // unknown role string → open
    return hasAnyRole(actorRoles, [required]);
  }

  /**
   * Asserts the actor can approve the gate or throws `GateAuthorizationError`.
   */
  assertCanApprove(
    actorRoles: Role[],
    gate: { accountableRole?: string },
    gateId: string,
  ): void {
    if (!gate.accountableRole) return;
    const required = gateRoleFromString(gate.accountableRole);
    if (required === undefined) return;
    if (!hasAnyRole(actorRoles, [required])) {
      throw new GateAuthorizationError(gateId, 'approve', required, actorRoles);
    }
  }

  /**
   * Asserts the actor can waive the gate or throws `GateAuthorizationError`.
   */
  assertCanWaive(
    actorRoles: Role[],
    gate: { waiverAuthority?: string },
    gateId: string,
  ): void {
    if (!gate.waiverAuthority) return;
    const required = gateRoleFromString(gate.waiverAuthority);
    if (required === undefined) return;
    if (!hasAnyRole(actorRoles, [required])) {
      throw new GateAuthorizationError(gateId, 'waive', required, actorRoles);
    }
  }
}

/** Singleton instance — import and use directly when DI is unavailable. */
export const gateRoleEnforcer = new GateRoleEnforcer();
