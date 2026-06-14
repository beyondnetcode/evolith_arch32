import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../infrastructure/auth/api-key.guard';
import { MetricsService } from '../../infrastructure/metrics/metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @ApiResponse({ status: 200, description: 'Prometheus metrics in text format' })
  async getMetrics(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(await this.metricsService.getMetrics());
  }
}
