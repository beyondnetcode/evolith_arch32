import './tracing';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupOpenApi } from './openapi';
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

  const swaggerEnabled =
    config.get('NODE_ENV') !== 'production' ||
    config.get('SWAGGER_ENABLED') === 'true';

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

  app.use(helmet());

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
