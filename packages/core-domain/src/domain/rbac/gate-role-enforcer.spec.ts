import { Role } from './role';
import { GateRoleEnforcer } from './gate-role-enforcer';
import { GateAuthorizationError } from '../errors/gate-authorization.error';

const enforcer = new GateRoleEnforcer();

// ─── canApprove ────────────────────────────────────────────────────────────

describe('GateRoleEnforcer.canApprove()', () => {
  it('returns true when no accountableRole is set (open gate)', () => {
    expect(enforcer.canApprove([Role.DEVELOPER], {})).toBe(true);
    expect(enforcer.canApprove([], {})).toBe(true);
  });

  it('returns true when actor holds the exact required role', () => {
    expect(
      enforcer.canApprove([Role.PRODUCT_OWNER], { accountableRole: 'Product Owner' }),
    ).toBe(true);
  });

  it('returns false when actor lacks the required role', () => {
    expect(
      enforcer.canApprove([Role.DEVELOPER], { accountableRole: 'Product Owner' }),
    ).toBe(false);
  });

  it('returns true when actor is CTO (supersedes all roles)', () => {
    expect(
      enforcer.canApprove([Role.CTO], { accountableRole: 'Product Owner' }),
    ).toBe(true);
  });

  it('returns true when actor is ADMIN (supersedes all roles)', () => {
    expect(
      enforcer.canApprove([Role.ADMIN], { accountableRole: 'QA Lead' }),
    ).toBe(true);
  });

  it('returns true for unknown accountableRole string (treated as open)', () => {
    expect(
      enforcer.canApprove([Role.DEVELOPER], { accountableRole: 'Executive Sponsor' }),
    ).toBe(true);
  });

  it('returns true when one of multiple actor roles satisfies requirement', () => {
    expect(
      enforcer.canApprove([Role.DEVELOPER, Role.TECH_LEAD], {
        accountableRole: 'Tech Lead',
      }),
    ).toBe(true);
  });
});

// ─── canWaive ──────────────────────────────────────────────────────────────

describe('GateRoleEnforcer.canWaive()', () => {
  it('returns true when no waiverAuthority is set (open gate)', () => {
    expect(enforcer.canWaive([Role.DEVELOPER], {})).toBe(true);
  });

  it('returns true when actor holds the exact required role', () => {
    expect(
      enforcer.canWaive([Role.ARCHITECT], { waiverAuthority: 'Software Architect' }),
    ).toBe(true);
  });

  it('returns false when actor lacks the required role', () => {
    expect(
      enforcer.canWaive([Role.DEVELOPER], { waiverAuthority: 'Software Architect' }),
    ).toBe(false);
  });

  it('returns true when actor is CTO', () => {
    expect(
      enforcer.canWaive([Role.CTO], { waiverAuthority: 'Software Architect' }),
    ).toBe(true);
  });

  it('returns true when actor is ADMIN', () => {
    expect(
      enforcer.canWaive([Role.ADMIN], { waiverAuthority: 'DevOps Lead' }),
    ).toBe(true);
  });
});

// ─── assertCanApprove ──────────────────────────────────────────────────────

describe('GateRoleEnforcer.assertCanApprove()', () => {
  it('does not throw when actor is authorized', () => {
    expect(() =>
      enforcer.assertCanApprove([Role.PRODUCT_OWNER], { accountableRole: 'Product Owner' }, 'gate-f1'),
    ).not.toThrow();
  });

  it('throws GateAuthorizationError when actor is not authorized', () => {
    expect(() =>
      enforcer.assertCanApprove([Role.DEVELOPER], { accountableRole: 'Product Owner' }, 'gate-f1'),
    ).toThrow(GateAuthorizationError);
  });

  it('GateAuthorizationError carries the expected fields', () => {
    try {
      enforcer.assertCanApprove([Role.DEVELOPER], { accountableRole: 'Product Owner' }, 'gate-f1');
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(GateAuthorizationError);
      const e = err as GateAuthorizationError;
      expect(e.gateId).toBe('gate-f1');
      expect(e.action).toBe('approve');
      expect(e.required).toBe(Role.PRODUCT_OWNER);
      expect(e.actual).toEqual([Role.DEVELOPER]);
      expect(e.code).toBe('GATE_AUTHORIZATION_ERROR');
    }
  });

  it('does not throw when no accountableRole is set', () => {
    expect(() =>
      enforcer.assertCanApprove([Role.DEVELOPER], {}, 'gate-f1'),
    ).not.toThrow();
  });
});

// ─── assertCanWaive ────────────────────────────────────────────────────────

describe('GateRoleEnforcer.assertCanWaive()', () => {
  it('throws GateAuthorizationError when actor cannot waive', () => {
    expect(() =>
      enforcer.assertCanWaive([Role.DEVELOPER], { waiverAuthority: 'Software Architect' }, 'gate-f2'),
    ).toThrow(GateAuthorizationError);
  });

  it('does not throw when actor holds the waiver role', () => {
    expect(() =>
      enforcer.assertCanWaive([Role.ARCHITECT], { waiverAuthority: 'Software Architect' }, 'gate-f2'),
    ).not.toThrow();
  });
});
