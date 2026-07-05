import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealthStatus() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Evolith Core API',
    };
  }
}
