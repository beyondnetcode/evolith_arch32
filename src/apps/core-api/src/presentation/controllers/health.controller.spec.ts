import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';
import { HealthService } from '../../application/services/health.service';
import { MetricsService } from '../../infrastructure/metrics/metrics.service';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';

const mockFs: jest.Mocked<IFileSystem> = {
  exists: jest.fn(),
  readFile: jest.fn(),
  readJson: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn(),
  // GT-566: readiness now resolves the corpus root by CONTENT (the same probe
  // the ruleset repository uses), so the fake filesystem has to answer
  // directory listings, not just existence.
  readdirNames: jest.fn(),
  rename: jest.fn(),
  rm: jest.fn(),
  stat: jest.fn(),
  copy: jest.fn(),
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: MetricsService,
          useValue: {
            getMetrics: jest.fn().mockResolvedValue(''),
            gateEvaluationsTotal: {},
            gateEvaluationDuration: {},
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('/corpus'),
            getOrThrow: jest.fn().mockReturnValue('/corpus'),
          },
        },
        { provide: 'IFileSystem', useValue: mockFs },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return liveness status', () => {
    const result = controller.live();
    expect(result.status).toBe('UP');
    expect(result.timestamp).toBeDefined();
  });

  it('should return UP when corpus file exists', async () => {
    mockFs.exists.mockResolvedValue(true);
    mockFs.readdirNames.mockResolvedValue(['schema', 'sdlc', 'architecture']);
    const result = await controller.ready();
    expect(result.status).toBe('UP');
    expect(result.checks.corpus).toBe('UP');
  });

  it('should throw 503 when corpus file is missing', async () => {
    mockFs.exists.mockResolvedValue(false);
    mockFs.readdirNames.mockResolvedValue([]);
    await expect(controller.ready()).rejects.toMatchObject({ status: 503 });
  });

  // GT-566: readiness used to probe only `<core>/rulesets/sdlc/phase-gates.rules.json`.
  // Against a Core monorepo checkout (corpus at `src/rulesets`) that path is absent, so
  // a perfectly healthy service reported DOWN. Resolution now finds the real corpus.
  it('is UP when the corpus lives at <core>/src/rulesets', async () => {
    mockFs.readdirNames.mockImplementation(async (p: string) =>
      p.endsWith('/src/rulesets') ? ['schema', 'sdlc'] : ['agents'],
    );
    mockFs.exists.mockImplementation(async (p: string) => !p.startsWith('/corpus/rulesets/sdlc'));
    const result = await controller.ready();
    expect(result.checks.corpus).toBe('UP');
  });

  // The converse: a `rulesets/` directory that holds no corpus must not be
  // mistaken for one and reported UP.
  it('is DOWN when rulesets/ exists but holds no corpus', async () => {
    mockFs.exists.mockResolvedValue(true);
    mockFs.readdirNames.mockResolvedValue(['agents']);
    await expect(controller.ready()).rejects.toMatchObject({ status: 503 });
  });
});
