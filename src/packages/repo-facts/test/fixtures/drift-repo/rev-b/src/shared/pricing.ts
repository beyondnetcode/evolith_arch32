export function applyDiscount(total: number, rate: number): number {
  const discounted = total - total * rate;
  if (discounted < 0) {
    return 0;
  }
  return Math.round(discounted * 100) / 100;
}
