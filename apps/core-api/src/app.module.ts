import { Module } from '@nestjs/common';
import { HealthController } from './presentation/controllers/health.controller';
import { HealthService } from './application/services/health.service';
import { GatesController } from './presentation/controllers/gates.controller';
import { ProjectsController } from './presentation/controllers/projects.controller';
import { ArchitectureController } from './presentation/controllers/architecture.controller';
import { CoreDomainModule } from './core-domain.module';

@Module({
  imports: [CoreDomainModule],
  controllers: [
    HealthController,
    GatesController,
    ProjectsController,
    ArchitectureController
  ],
  providers: [
    HealthService,
  ],
})
export class AppModule {}
