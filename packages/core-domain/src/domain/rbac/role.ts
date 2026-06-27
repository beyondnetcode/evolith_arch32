/**
 * Formal role model for Evolith ABAC/gate checks (GT-319).
 *
 * Role values are canonical lowercase strings used in code.
 * Gate JSON files (gate-f*.json) use human-readable labels (e.g. "Product Owner",
 * "Software Architect") that map 1:1 to these enum values via GATE_ROLE_MAP.
 */
export enum Role {
  DEVELOPER = 'developer',
  TECH_LEAD = 'tech_lead',
  QA_LEAD = 'qa_lead',
  QA_ENGINEER = 'qa_engineer',
  DEVOPS_LEAD = 'devops_lead',
  DEVOPS_ENGINEER = 'devops_engineer',
  ARCHITECT = 'architect',
  PRODUCT_OWNER = 'product_owner',
  SECURITY_ENGINEER = 'security_engineer',
  CTO = 'cto',
  ADMIN = 'admin',
}

/**
 * Maps human-readable gate `accountableRole` strings (as found in gate JSON files)
 * to the canonical Role enum value.
 */
export const GATE_ROLE_MAP: Record<string, Role> = {
  'Product Owner': Role.PRODUCT_OWNER,
  'Software Architect': Role.ARCHITECT,
  'Tech Lead': Role.TECH_LEAD,
  'QA Lead': Role.QA_LEAD,
  'DevOps Lead': Role.DEVOPS_LEAD,
};

/**
 * ROLE_HIERARCHY defines which roles a given role implicitly includes.
 * Higher roles subsume the capabilities of lower roles.
 *
 * Reading: "an actor with role X is also considered to have roles Y, Z…"
 */
export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  [Role.ADMIN]: Object.values(Role) as Role[],
  [Role.CTO]: [
    Role.ARCHITECT,
    Role.TECH_LEAD,
    Role.QA_LEAD,
    Role.DEVOPS_LEAD,
    Role.PRODUCT_OWNER,
    Role.DEVELOPER,
    Role.QA_ENGINEER,
    Role.DEVOPS_ENGINEER,
    Role.SECURITY_ENGINEER,
  ],
  [Role.ARCHITECT]: [Role.TECH_LEAD, Role.DEVELOPER],
  [Role.TECH_LEAD]: [Role.DEVELOPER],
  [Role.QA_LEAD]: [Role.QA_ENGINEER],
  [Role.DEVOPS_LEAD]: [Role.DEVOPS_ENGINEER],
  [Role.PRODUCT_OWNER]: [],
  [Role.SECURITY_ENGINEER]: [],
  [Role.DEVELOPER]: [],
  [Role.QA_ENGINEER]: [],
  [Role.DEVOPS_ENGINEER]: [],
};

/**
 * Returns the full set of roles an actor effectively holds, including
 * all roles implied by the hierarchy.
 */
export function resolveEffectiveRoles(actorRoles: Role[]): Set<Role> {
  const effective = new Set<Role>();

  const expand = (role: Role): void => {
    if (effective.has(role)) return;
    effective.add(role);
    for (const implied of ROLE_HIERARCHY[role] ?? []) {
      expand(implied);
    }
  };

  for (const role of actorRoles) {
    expand(role);
  }
  return effective;
}

/**
 * Returns true when the actor holds `requiredRole` directly or via hierarchy.
 */
export function hasRole(actorRoles: Role[], requiredRole: Role): boolean {
  return resolveEffectiveRoles(actorRoles).has(requiredRole);
}

/**
 * Returns true when the actor holds at least one of the `requiredRoles`
 * directly or via hierarchy.
 */
export function hasAnyRole(actorRoles: Role[], requiredRoles: Role[]): boolean {
  if (requiredRoles.length === 0) return true;
  const effective = resolveEffectiveRoles(actorRoles);
  return requiredRoles.some(r => effective.has(r));
}

/**
 * Normalises a gate `accountableRole` string (e.g. "Product Owner") to a Role enum value.
 * Returns undefined when the string is not in GATE_ROLE_MAP.
 */
export function gateRoleFromString(label: string): Role | undefined {
  return GATE_ROLE_MAP[label];
}
