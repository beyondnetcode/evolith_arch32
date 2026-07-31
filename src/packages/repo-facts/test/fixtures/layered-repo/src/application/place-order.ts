// Fixture (GT-589). Application → infrastructure is a LEGAL import in this fixture's
// layering; so is cli → application. The illegal thing is what the composition of the
// two makes reachable, and no pairwise import rule can see a composition.
import { connectionPool } from '../infrastructure/db-pool';

export function placeOrder(orderId: string): string {
  return connectionPool.query('insert order ' + orderId);
}
