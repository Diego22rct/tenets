export function classify(x: number): string {
  if (x === 0) return 'zero';
  if (x === 1) return 'one';
  if (x === 2) return 'two';
  if (x === 3) return 'three';
  if (x === 4) return 'four';
  if (x === 5) return 'five';
  if (x === 6) return 'six';
  if (x === 7) return 'seven';
  if (x === 8) return 'eight';
  if (x === 9) return 'nine';
  if (x === 10) return 'ten';
  return 'unknown';
}
