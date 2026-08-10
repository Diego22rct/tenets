export function deeplyNested(a: number): number {
  if (a > 0) {
    if (a > 1) {
      if (a > 2) {
        if (a > 3) {
          if (a > 4) {
            return a;
          }
        }
      }
    }
  }
  return 0;
}
