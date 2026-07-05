import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType, Controller, Get } from '@nestjs/common';
import { AppModule } from './app.module';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
import helmet from 'helmet';
import { correlationIdMiddleware } from './infrastructure/middleware/correlation-id.middleware';
import { HttpExceptionFilter } from './infrastructure/filters/http-exception.filter';
import { EnvelopeInterceptor } from './infrastructure/interceptors/envelope.interceptor';
import { Deprecated, DeprecationInterceptor } from './infrastructure/interceptors/deprecation.interceptor';

@Controller({ path: 'deprecated-test', version: '1' })
class TestDeprecatedController {
  @Get()
  @Deprecated({ sunset: '2026-09-21', successor: '/api/v1/successor' })
  test() {
    return { ok: true };
  }
}

describe('Core API E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestDeprecatedController],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.enableVersioning({ type: VersioningType.URI, prefix: "api/v", defaultVersion: '1' });

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new DeprecationInterceptor(), new EnvelopeInterceptor());

    app.use(helmet());
    app.use(correlationIdMiddleware);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Flow 1: Health Check (Public)', () => {
    it('should return service health status wrapped in the ADR-0073 envelope', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('OK');
      expect(res.body.meta.command).toContain('http GET');
      expect(res.body.meta.schemaVersion).toBeDefined();
    });
  });

  describe('Flow 2: RFC 9457 Problem Details wrapped in error envelope', () => {
    it('should return a failure envelope whose details carry RFC 9457 fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/architecture/validate-satellite')
        .send({});
      expect(res.status).toBe(400);
      expect(res.headers['x-problem-format']).toBe('rfc9457');
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.details).toHaveProperty('status', 400);
      expect(res.body.error.details).toHaveProperty('type');
      expect(res.body.meta.schemaVersion).toBeDefined();
    });
  });

  describe('Flow 3: Validated Requests', () => {
    it('should reject empty body with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/architecture/validate-satellite')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Flow 4: Core reference reads', () => {
    it('should expose rulesets and phase requirements as public Core artifacts', async () => {
      const rulesets = await request(app.getHttpServer()).get('/api/v1/rulesets');

      expect(rulesets.status).toBe(200);
      expect(rulesets.body.success).toBe(true);
      const rulesetList = rulesets.body.data as Array<{ id: string }>;
      expect(rulesetList.length).toBeGreaterThan(0);

      const ruleset = await request(app.getHttpServer())
        .get(`/api/v1/rulesets/${encodeURIComponent(rulesetList[0].id)}`);
      expect(ruleset.status).toBe(200);
      expect(ruleset.body.success).toBe(true);

      const gate = await request(app.getHttpServer())
        .get('/api/v1/gates/PG1');
      expect(gate.status).toBe(200);
      expect(gate.body.data.phase).toBe(1);

      const requirements = await request(app.getHttpServer())
        .get('/api/v1/phases/1/requirements');
      expect(requirements.status).toBe(200);
      expect(requirements.body.data.mandatoryEvidence.length).toBeGreaterThan(0);
    });
  });

  describe('Flow 5: Deprecated route headers', () => {
    it('should inject RFC 8594 and RFC 9745 headers on deprecated routes', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/deprecated-test');
      expect(res.status).toBe(200);
      expect(res.headers['deprecation']).toBe('true');
      expect(res.headers['sunset']).toBeDefined();
      expect(res.headers['link']).toContain('successor-version');
    });
  });
});
