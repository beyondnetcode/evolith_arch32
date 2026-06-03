import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';

jest.mock('conf', () => {
  return jest.fn().mockImplementation(() => {
    let store: any = {
      version: '1.0.0',
      telemetryEnabled: true,
      knownSatellites: [],
    };
    return {
      get: jest.fn((key) => store[key]),
      set: jest.fn((key, val) => { store[key] = val; }),
      path: '/mock/path/config.yaml',
    };
  });
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
    let satellites = service.get('knownSatellites');
    expect(satellites).toContain('/test/path');

    // Add again
    service.addSatellite('/test/path');
    satellites = service.get('knownSatellites');
    expect(satellites.length).toBe(1); // No duplicates
  });
});
