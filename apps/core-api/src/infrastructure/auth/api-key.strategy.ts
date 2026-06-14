import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly apiKeyService: ApiKeyService) {
    super();
  }

  async validate(req: Request): Promise<boolean> {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      throw new UnauthorizedException('Missing x-api-key header');
    }
    const isValid = await this.apiKeyService.validateApiKey(apiKey);
    if (!isValid) {
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }
}
