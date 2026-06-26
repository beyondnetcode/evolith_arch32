import { TenantAuthorityService, Tenant } from './tenant-authority';

describe('TenantAuthorityService', () => {
  let service: TenantAuthorityService;
  const tenant: Tenant = { id: 't1', name: 'Acme', tier: 'pro', allowedTopologies: ['modular-monolith'], maxSatellites: 5 };
  beforeEach(() => { service = new TenantAuthorityService(); service.register(tenant); });
  it('should return tenant by id', () => { expect(service.get('t1')).toBe(tenant); });
  it('should allow permitted topology', () => { expect(service.canUseTopology('t1', 'modular-monolith')).toBe(true); });
  it('should deny unpermitted topology', () => { expect(service.canUseTopology('t1', 'microservices')).toBe(false); });
  it('should respect satellite limit', () => {
    expect(service.isWithinSatelliteLimit('t1', 4)).toBe(true);
    expect(service.isWithinSatelliteLimit('t1', 5)).toBe(false);
  });
});
