import {
  Role,
  GATE_ROLE_MAP,
  ROLE_HIERARCHY,
  resolveEffectiveRoles,
  hasRole,
  hasAnyRole,
  gateRoleFromString,
} from './role';

describe('role', () => {
  describe('Role enum', () => {
    it('has all expected roles', () => {
      expect(Role.DEVELOPER).toBe('developer');
      expect(Role.ARCHITECT).toBe('architect');
      expect(Role.ADMIN).toBe('admin');
      expect(Role.PRODUCT_OWNER).toBe('product_owner');
    });
  });

  describe('GATE_ROLE_MAP', () => {
    it('maps human-readable labels to Role enum', () => {
      expect(GATE_ROLE_MAP['Product Owner']).toBe(Role.PRODUCT_OWNER);
      expect(GATE_ROLE_MAP['Software Architect']).toBe(Role.ARCHITECT);
      expect(GATE_ROLE_MAP['Tech Lead']).toBe(Role.TECH_LEAD);
    });
  });

  describe('hasRole', () => {
    it('returns true when actor has the required role', () => {
      expect(hasRole([Role.DEVELOPER], Role.DEVELOPER)).toBe(true);
    });

    it('returns true when actor has a parent role', () => {
      // ADMIN should inherit from all roles
      expect(hasRole([Role.ADMIN], Role.DEVELOPER)).toBe(true);
    });

    it('returns false when actor lacks the role', () => {
      expect(hasRole([Role.DEVELOPER], Role.ARCHITECT)).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('returns true when actor has at least one required role', () => {
      expect(hasAnyRole([Role.DEVELOPER], [Role.DEVELOPER, Role.ARCHITECT])).toBe(true);
    });

    it('returns false when actor has none of the required roles', () => {
      expect(hasAnyRole([Role.DEVELOPER], [Role.ARCHITECT, Role.ADMIN])).toBe(false);
    });

    it('returns true when requiredRoles is empty', () => {
      expect(hasAnyRole([Role.DEVELOPER], [])).toBe(true);
    });
  });

  describe('gateRoleFromString', () => {
    it('converts human-readable label to Role', () => {
      expect(gateRoleFromString('Product Owner')).toBe(Role.PRODUCT_OWNER);
      expect(gateRoleFromString('Software Architect')).toBe(Role.ARCHITECT);
    });

    it('returns undefined for unknown label', () => {
      expect(gateRoleFromString('Unknown Role')).toBeUndefined();
    });
  });

  describe('resolveEffectiveRoles', () => {
    it('includes inherited roles', () => {
      const effective = resolveEffectiveRoles([Role.ADMIN]);
      expect(effective.has(Role.DEVELOPER)).toBe(true);
      expect(effective.has(Role.ARCHITECT)).toBe(true);
    });
  });
});
