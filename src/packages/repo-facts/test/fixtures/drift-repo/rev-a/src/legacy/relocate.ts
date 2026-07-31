export function relocateMe(items: string[]): string {
  const joined = items.join(',');
  if (joined.length === 0) {
    return 'empty';
  }
  return joined.toUpperCase();
}
