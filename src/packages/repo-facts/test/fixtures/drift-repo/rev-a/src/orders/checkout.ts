import { applyDiscount } from '../shared/pricing';

export function checkout(total: number): number {
  try {
    return applyDiscount(total, 0.1);
  } catch {
  }
  return 0;
}

export const coerce = (value: unknown): number => (value as any).amount!;
