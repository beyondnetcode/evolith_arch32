import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
import helmet from 'helmet';
import { correlationIdMiddleware } from './infrastructure/middleware/correlation-id.middleware';
import { HttpExceptionFilter } from './infrastructure/filters/http-exception.filter';


describe('Core API E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.enableVersioning({ type: VersioningType.URI, prefix: "api/v", defaultVersion: '1' });

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    app.useGlobalFilters(new HttpExceptionFilter());

    app.use(helmet());
    app.use(correlationIdMiddleware);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Flow 1: Health Check (Public)', () => {
    it('should return service health status without auth', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
    });
  });

  describe('Flow 2: RFC 9457 Problem Details', () => {
    it('should return application/problem+json on 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/architecture/validate-satellite')
        .send({});
      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body).toHaveProperty('status', 400);
    });
  });

  describe('Flow 3: Validated Requests', () => {
    it('should reject empty body with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/architecture/validate-satellite')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('Flow 4: Core reference reads', () => {
    it('should expose rulesets and phase requirements as public Core artifacts', async () => {
      const rulesets = await request(app.getHttpServer()).get('/api/v1/rulesets');

      expect(rulesets.status).toBe(200);
      expect(rulesets.body.length).toBeGreaterThan(0);

      const ruleset = await request(app.getHttpServer())
        .get(`/api/v1/rulesets/${encodeURIComponent(rulesets.body[0].id)}`);
      expect(ruleset.status).toBe(200);

      const gate = await request(app.getHttpServer())
        .get('/api/v1/gates/PG1');
      expect(gate.status).toBe(200);
      expect(gate.body.phase).toBe(1);

      const requirements = await request(app.getHttpServer())
        .get('/api/v1/phases/1/requirements');
      expect(requirements.status).toBe(200);
      expect(requirements.body.mandatoryEvidence.length).toBeGreaterThan(0);
    });
  });
});
