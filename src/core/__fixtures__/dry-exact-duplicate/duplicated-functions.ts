export function computeTotalPriceA(items: number[]): number {
  let total = 0;
  let count = 0;
  for (const item of items) {
    total += item;
    count += 1;
  }
  return total;
}

export function computeTotalPriceB(values: number[]): number {
  let sum = 0;
  let n = 0;
  for (const value of values) {
    sum += value;
    n += 1;
  }
  return sum;
}
