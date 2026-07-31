// Fixture (GT-589). Half of a genuine runtime import cycle: orders ↔ billing.
import { invoiceTotal } from '../billing/invoice';

export const ORDER_TAX = 0.19;

export function orderTotal(): number {
  return invoiceTotal();
}
