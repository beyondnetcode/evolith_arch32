import {
  Role,
  ROLE_HIERARCHY,
  hasRole,
  hasAnyRole,
  resolveEffectiveRoles,
  gateRoleFromString,
  GATE_ROLE_MAP,
} from './role';

describe('Role enum', () => {
  it('defines all expected roles', () => {
    expect(Object.values(Role)).toContain('developer');
    expect(Object.values(Role)).toContain('tech_lead');
    expect(Object.values(Role)).toContain('architect');
    expect(Object.values(Role)).toContain('product_owner');
    expect(Object.values(Role)).toContain('admin');
    expect(Object.values(Role)).toContain('cto');
  });
});

describe('ROLE_HIERARCHY', () => {
  it('ADMIN includes all roles', () => {
    const allRoles = Object.values(Role) as Role[];
    expect(ROLE_HIERARCHY[Role.ADMIN]).toEqual(expect.arrayContaining(allRoles));
  });

  it('CTO includes ARCHITECT, TECH_LEAD, DEVELOPER', () => {
    expect(ROLE_HIERARCHY[Role.CTO]).toContain(Role.ARCHITECT);
    expect(ROLE_HIERARCHY[Role.CTO]).toContain(Role.TECH_LEAD);
    expect(ROLE_HIERARCHY[Role.CTO]).toContain(Role.DEVELOPER);
  });

  it('DEVELOPER has no implied roles', () => {
    expect(ROLE_HIERARCHY[Role.DEVELOPER]).toHaveLength(0);
  });
});

describe('resolveEffectiveRoles', () => {
  it('ADMIN resolves to all roles', () => {
    const effective = resolveEffectiveRoles([Role.ADMIN]);
    for (const role of Object.values(Role) as Role[]) {
      expect(effective.has(role)).toBe(true);
    }
  });

  it('CTO resolves transitively to DEVELOPER via ARCHITECT -> TECH_LEAD -> DEVELOPER', () => {
    const effective = resolveEffectiveRoles([Role.CTO]);
    expect(effective.has(Role.DEVELOPER)).toBe(true);
    expect(effective.has(Role.ARCHITECT)).toBe(true);
  });

  it('ARCHITECT resolves to TECH_LEAD and DEVELOPER', () => {
    const effective = resolveEffectiveRoles([Role.ARCHITECT]);
    expect(effective.has(Role.TECH_LEAD)).toBe(true);
    expect(effective.has(Role.DEVELOPER)).toBe(true);
    // but NOT product_owner
    expect(effective.has(Role.PRODUCT_OWNER)).toBe(false);
  });

  it('DEVELOPER only resolves to itself', () => {
    const effective = resolveEffectiveRoles([Role.DEVELOPER]);
    expect(effective.size).toBe(1);
    expect(effective.has(Role.DEVELOPER)).toBe(true);
  });
});

describe('hasRole', () => {
  it('ADMIN has every role', () => {
    for (const role of Object.values(Role) as Role[]) {
      expect(hasRole([Role.ADMIN], role)).toBe(true);
    }
  });

  it('CTO has ARCHITECT', () => {
    expect(hasRole([Role.CTO], Role.ARCHITECT)).toBe(true);
  });

  it('DEVELOPER does not have TECH_LEAD', () => {
    expect(hasRole([Role.DEVELOPER], Role.TECH_LEAD)).toBe(false);
  });

  it('TECH_LEAD does not have ARCHITECT', () => {
    expect(hasRole([Role.TECH_LEAD], Role.ARCHITECT)).toBe(false);
  });

  it('actor with multiple roles gets combined effective roles', () => {
    expect(hasRole([Role.DEVELOPER, Role.PRODUCT_OWNER], Role.PRODUCT_OWNER)).toBe(true);
    expect(hasRole([Role.DEVELOPER, Role.PRODUCT_OWNER], Role.TECH_LEAD)).toBe(false);
  });
});

describe('hasAnyRole', () => {
  it('returns true when actor holds at least one required role via hierarchy', () => {
    expect(hasAnyRole([Role.ARCHITECT], [Role.TECH_LEAD, Role.QA_LEAD])).toBe(true);
  });

  it('returns false when actor holds none of the required roles', () => {
    expect(hasAnyRole([Role.DEVELOPER], [Role.TECH_LEAD, Role.ARCHITECT])).toBe(false);
  });

  it('returns true for empty requiredRoles', () => {
    expect(hasAnyRole([Role.DEVELOPER], [])).toBe(true);
  });

  it('returns true for actor who directly matches a required role', () => {
    expect(hasAnyRole([Role.QA_ENGINEER], [Role.QA_ENGINEER])).toBe(true);
  });
});

describe('gateRoleFromString', () => {
  it('maps gate accountableRole strings to Role enum', () => {
    expect(gateRoleFromString('Product Owner')).toBe(Role.PRODUCT_OWNER);
    expect(gateRoleFromString('Software Architect')).toBe(Role.ARCHITECT);
    expect(gateRoleFromString('Tech Lead')).toBe(Role.TECH_LEAD);
    expect(gateRoleFromString('QA Lead')).toBe(Role.QA_LEAD);
    expect(gateRoleFromString('DevOps Lead')).toBe(Role.DEVOPS_LEAD);
  });

  it('returns undefined for unknown label', () => {
    expect(gateRoleFromString('Unknown Role')).toBeUndefined();
  });
});

describe('GATE_ROLE_MAP', () => {
  it('covers all five gate accountableRole values', () => {
    const gateLabels = ['Product Owner', 'Software Architect', 'Tech Lead', 'QA Lead', 'DevOps Lead'];
    for (const label of gateLabels) {
      expect(GATE_ROLE_MAP[label]).toBeDefined();
    }
  });
});
