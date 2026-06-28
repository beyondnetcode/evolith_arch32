import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

/**
 * Core-API E2E — the real Core HTTP surface (test playbook: core-api).
 *
 * Replaces the stale NestJS `GET / -> "Hello World!"` boilerplate (the app has
 * no root route). Boots the full AppModule with the same URI versioning as
 * main.ts and drives the actual public endpoints. WORKSPACE_ROOT/CORE_PATH are
 * set by test-setup.js (wired via jest-e2e.json setupFiles) so the corpus loads.
 */
describe('core-api (e2e) — Core HTTP surface', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, prefix: 'api/v', defaultVersion: '1' });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live → 200 (liveness probe, version-neutral)', () => {
    return request(app.getHttpServer()).get('/health/live').expect(200);
  });

  it('GET /health → 200 (combined health check)', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  it('GET /metrics → 200 (metrics surface, version-neutral)', () => {
    return request(app.getHttpServer()).get('/metrics').expect(200);
  });

  it('GET /api/v1/rulesets → 200 (versioned reference surface)', () => {
    return request(app.getHttpServer()).get('/api/v1/rulesets').expect(200);
  });

  it('GET / → 404 (no root route — the boilerplate route does not exist)', () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });
});
