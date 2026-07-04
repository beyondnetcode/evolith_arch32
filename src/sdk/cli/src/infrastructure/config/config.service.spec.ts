import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';

jest.mock('conf', () => {
  const store: Record<string, unknown> = {
    version: '1.0.0',
    telemetryEnabled: true,
    knownSatellites: [],
    activeProfile: 'default',
    profiles: { default: {} },
  };
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string) => store[key]),
    set: jest.fn((key: string, val: unknown) => { store[key] = val; }),
    path: '/mock/path/config.yaml',
  }));
});

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigService],
    }).compile();
    service = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return default values', () => {
    expect(service.get('version')).toBe('1.0.0');
    expect(service.get('telemetryEnabled')).toBe(true);
  });

  it('should add a satellite only if it does not exist', () => {
    service.addSatellite('/test/path');
    const satellites = service.get('knownSatellites');
    expect(satellites).toContain('/test/path');
    service.addSatellite('/test/path');
    expect(service.get('knownSatellites').length).toBe(1);
  });

  it('should default activeProfile to default', () => {
    expect(service.activeProfile()).toBe('default');
  });

  it('should create and list profiles', () => {
    service.createProfile('prod', { core: '../evolith-core', tenant: 'acme' });
    expect(service.listProfiles()).toContain('prod');
  });

  it('should switch active profile', () => {
    service.createProfile('staging', { tenant: 'staging-acme' });
    service.switchProfile('staging');
    expect(service.activeProfile()).toBe('staging');
  });

  it('should return profile config', () => {
    service.createProfile('dev', { core: './core', satellite: './tracker' });
    const cfg = service.getProfile('dev');
    expect(cfg.core).toBe('./core');
    expect(cfg.satellite).toBe('./tracker');
  });

  it('should reject duplicate profile creation', () => {
    service.createProfile('test', {});
    expect(() => service.createProfile('test', {})).toThrow('already exists');
  });

  it('should reject switching to nonexistent profile', () => {
    expect(() => service.switchProfile('nope')).toThrow('does not exist');
  });

  it('should reject deleting the default profile', () => {
    expect(() => service.deleteProfile('default')).toThrow('Cannot delete');
  });

  it('should fall back to default after deleting active profile', () => {
    service.createProfile('temp', {});
    service.switchProfile('temp');
    service.deleteProfile('temp');
    expect(service.activeProfile()).toBe('default');
  });

  it('should read EVOLITH_PROFILE env var', () => {
    process.env.EVOLITH_PROFILE = 'env-profile';
    expect(service.activeProfile()).toBe('env-profile');
    delete process.env.EVOLITH_PROFILE;
  });
});
