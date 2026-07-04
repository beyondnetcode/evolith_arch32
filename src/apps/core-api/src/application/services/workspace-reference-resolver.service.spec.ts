import { BadRequestException } from '@nestjs/common';
import { WorkspaceReferenceResolverService } from './workspace-reference-resolver.service';

describe('WorkspaceReferenceResolverService', () => {
  const service = new WorkspaceReferenceResolverService({
    getOrThrow: jest.fn().mockReturnValue('/var/run/evolith/workspaces'),
  } as any);

  it('resolves an opaque BFF-issued reference under the configured workspace root', () => {
    expect(service.resolve('op_01j7wq8e2n')).toBe('/var/run/evolith/workspaces/op_01j7wq8e2n');
  });

  it.each(['../escape', '/absolute/path', 'has space', ''])('maintains tenant isolation by rejecting path traversal out of workspace root: %s', (ref) => {
    // ADR-0080: Ensures strict tenant isolation by avoiding path traversal between workspaces
    expect(() => service.resolve(ref)).toThrow(BadRequestException);
  });

  it('ensures credential handling is omitted (does not accept tokens or secrets, only opaque references)', () => {
    // ADR-0080: Core API strictly handles opaque references and does not process tokens or credentials.
    expect(() => service.resolve('op_valid123')).not.toThrow();
    expect(() => service.resolve('op_invalid/token')).toThrow(BadRequestException);
  });
});
