export function calculateTotal(amounts: string): number {
  if (!amounts) {
    return 0;
  }

  const amountArray = amounts
    .split(/[\n,]+/)
    .map((amt) => amt.trim())
    .filter((amt) => amt !== "")
    .map((amt) => parseFloat(amt));

  return amountArray
    .filter((num) => !isNaN(num))
    .reduce((sum, num) => sum + num, 0);
}
