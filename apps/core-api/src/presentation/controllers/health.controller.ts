import { Controller, Get } from '@nestjs/common';
import { HealthService } from '../../application/services/health.service';
import { Public } from '../../infrastructure/auth/api-key.guard';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  check() {
    return this.healthService.getHealthStatus();
  }
}
