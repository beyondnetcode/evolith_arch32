// Fixture (GT-589). The other half of the orders ↔ billing runtime cycle.
import { ORDER_TAX } from '../orders/order';

export function invoiceTotal(): number {
  return 100 * (1 + ORDER_TAX);
}
