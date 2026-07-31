// Fixture (GT-589). The boundary. It imports only the application layer.
import { placeOrder } from '../application/place-order';

export function runCheckout(orderId: string): string {
  return placeOrder(orderId);
}
