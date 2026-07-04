import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export const OPENAPI_CONFIG = {
  title: 'Evolith Core API',
  description: 'Core API for gate evaluation, phase transitions, project initialization, and architecture drift detection',
  version: '1.0.0',
  docsPath: 'api/docs',
};

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle(OPENAPI_CONFIG.title)
    .setDescription(OPENAPI_CONFIG.description)
    .setVersion(OPENAPI_CONFIG.version)
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}

export function setupOpenApi(app: INestApplication): void {
  const document = createOpenApiDocument(app);
  SwaggerModule.setup(OPENAPI_CONFIG.docsPath, app, document);
}
