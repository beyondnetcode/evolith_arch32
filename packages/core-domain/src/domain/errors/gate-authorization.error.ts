import { Role } from '../rbac/role';
import { EvolithError } from './index';

/**
 * Thrown when an actor attempts to approve or waive a gate without holding
 * the required role (GT-320).
 */
export class GateAuthorizationError extends EvolithError {
  constructor(
    public readonly gateId: string,
    public readonly action: 'approve' | 'waive',
    public readonly required: Role,
    public readonly actual: Role[],
  ) {
    super(
      `Actor is not authorized to ${action} gate "${gateId}": ` +
        `required role "${required}", actor holds [${actual.join(', ') || 'none'}]`,
      'GATE_AUTHORIZATION_ERROR',
      { gateId, action, required, actual },
    );
    this.name = 'GateAuthorizationError';
  }
}
