import { BadRequestException } from '@nestjs/common';
import { WorkspaceReferenceResolverService } from './workspace-reference-resolver.service';

describe('WorkspaceReferenceResolverService', () => {
  const service = new WorkspaceReferenceResolverService({
    getOrThrow: jest.fn().mockReturnValue('/var/run/evolith/workspaces'),
  } as any);

  it('resolves an opaque BFF-issued reference under the configured workspace root', () => {
    expect(service.resolve('op_01j7wq8e2n')).toBe('/var/run/evolith/workspaces/op_01j7wq8e2n');
  });

  it.each(['../escape', '/absolute/path', 'has space', ''])('rejects a caller path or invalid reference: %s', (ref) => {
    expect(() => service.resolve(ref)).toThrow(BadRequestException);
  });
});
