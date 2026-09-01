import './tracing';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupOpenApi, OPENAPI_CONFIG } from './openapi';
import helmet from 'helmet';
import { EnvConfig } from './infrastructure/config/env.validation';
import { HttpExceptionFilter } from './infrastructure/filters/http-exception.filter';
import { DeprecationInterceptor } from './infrastructure/interceptors/deprecation.interceptor';
import { EnvelopeInterceptor } from './infrastructure/interceptors/envelope.interceptor';
import { SecurityAuditInterceptor } from './infrastructure/interceptors/security-audit.interceptor';
import { MetricsService } from './infrastructure/metrics/metrics.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
    defaultVersion: '1',
  });

  const config = app.get(ConfigService<EnvConfig>);

  // L2: Swagger requires explicit opt-in in all environments (security hardening).
  // Previously auto-enabled in non-production, which exposed the full API surface
  // on misconfigured NODE_ENV. Now requires SWAGGER_ENABLED=true everywhere.
  const swaggerEnabled = config.get('SWAGGER_ENABLED') === 'true';

  if (swaggerEnabled) {
    setupOpenApi(app);
  }

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.useGlobalFilters(new HttpExceptionFilter());

  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(
    new SecurityAuditInterceptor(metricsService),
    new DeprecationInterceptor(),
    new EnvelopeInterceptor(),
  );

  // ADR-0119 §5. `helmet()` a secas NO cumple: sus valores por omisión son
  // `default-src 'self'` y `X-Frame-Options: SAMEORIGIN`, donde §5 exige `'none'` y
  // `DENY`. Una llamada sin opciones parece endurecimiento y entrega otra cosa.
  app.use(
    helmet({
      contentSecurityPolicy: { useDefaults: false, directives: { 'default-src': ["'none'"] } },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  // Swagger UI carga sus propios scripts, estilos e imágenes: bajo
  // `default-src 'none'` la página se sirve en blanco. La excepción se acota a la
  // ruta de la documentación y solo existe cuando alguien la habilitó de forma
  // explícita (`SWAGGER_ENABLED=true`), en vez de relajar el CSP de toda la API.
  if (swaggerEnabled) {
    app.use(
      `/${OPENAPI_CONFIG.docsPath}`,
      helmet({
        contentSecurityPolicy: {
          useDefaults: false,
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-inline'"],
            'style-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:'],
          },
        },
        frameguard: { action: 'deny' },
        referrerPolicy: { policy: 'no-referrer' },
      }),
    );
  }

  const nodeEnv = config.get('NODE_ENV');
  const rawOrigins = config.get('CORS_ORIGINS');
  // In production, CORS_ORIGINS must be set. Empty string/absent → deny all cross-origin.
  // Set CORS_ORIGINS=* to allow all (internal/BFF deployments).
  const corsOrigin = nodeEnv === 'development'
    ? '*'
    : (rawOrigins ? rawOrigins.split(',').map((s: string) => s.trim()) : false);

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'x-api-key'],
    credentials: false,
  });

  app.flushLogs();

  app.enableShutdownHooks();

  await app.listen(config.get('PORT', 3000));
}
bootstrap().catch((err) => {
  console.error('Error starting application', err);
});
