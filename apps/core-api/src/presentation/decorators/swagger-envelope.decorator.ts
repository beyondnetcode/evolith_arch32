import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiEnvelopeResponse = (
  model?: Type<any> | any,
  options: { status?: number; isArray?: boolean; description?: string } = {},
) => {
  const status = options.status ?? 200;
  const isArray = options.isArray ?? false;
  const description = options.description ?? 'Successful response';

  let dataSchema: any;
  const decorators: MethodDecorator[] = [];

  if (model) {
    if (typeof model === 'function') {
      decorators.push(ApiExtraModels(model));
      dataSchema = isArray
        ? { type: 'array', items: { $ref: getSchemaPath(model) } }
        : { $ref: getSchemaPath(model) };
    } else {
      dataSchema = model;
    }
  } else {
    dataSchema = { type: 'object', nullable: true };
  }

  decorators.push(
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: dataSchema,
          meta: {
            type: 'object',
            properties: {
              command: { type: 'string', example: 'http GET /api/v1/resource' },
              executedAt: { type: 'string', format: 'date-time' },
              durationMs: { type: 'number', example: 15 },
              correlationId: { type: 'string', example: 'evl-uuid' },
              schemaVersion: { type: 'string', example: '1.0.0' },
              context: {
                type: 'object',
                properties: {
                  initiative: { type: 'string' },
                  tenant: { type: 'string' },
                  phase: { type: 'string' },
                },
              },
            },
            required: ['command', 'executedAt', 'durationMs', 'correlationId', 'schemaVersion'],
          },
        },
        required: ['success', 'data', 'meta'],
      },
    }),
  );

  return applyDecorators(...decorators);
};
