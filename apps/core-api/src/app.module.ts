import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { PassportModule } from '@nestjs/passport';
import { HealthController } from './presentation/controllers/health.controller';
import { HealthService } from './application/services/health.service';
import { GatesController } from './presentation/controllers/gates.controller';
import { ProjectsController } from './presentation/controllers/projects.controller';
import { ArchitectureController } from './presentation/controllers/architecture.controller';
import { CoreDomainModule } from './core-domain.module';
import { CorrelationIdMiddleware } from './infrastructure/middleware/correlation-id.middleware';
import { ApiKeyAuthGuard } from './infrastructure/auth/api-key.guard';
import { ApiKeyStrategy } from './infrastructure/auth/api-key.strategy';
import { ApiKeyService } from './infrastructure/auth/api-key.service';
import { validateEnv } from './infrastructure/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    CoreDomainModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: false,
        quietReqLogger: true,
      },
    }),
    PassportModule,
  ],
  controllers: [
    HealthController,
    GatesController,
    ProjectsController,
    ArchitectureController
  ],
  providers: [
    HealthService,
    ApiKeyService,
    ApiKeyStrategy,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
