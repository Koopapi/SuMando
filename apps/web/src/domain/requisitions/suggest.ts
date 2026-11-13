// Cantidades sugeridas para una requisición (spec 007, RF-10, RF-14 a RF-16). Enteros en millonésimas de la unidad
// base, como las existencias (spec 005); equivalencias en milésimas (spec 003).

/** RF-14: lo que falta para llegar al máximo, o al mínimo si no hay máximo; null si no está bajo el mínimo. */
export function shortfall(stockMicro: bigint, minMicro: bigint | null, maxMicro: bigint | null): bigint | null {
  if (minMicro === null || stockMicro >= minMicro) return null;
  const target = maxMicro !== null && maxMicro > minMicro ? maxMicro : minMicro;
  return target - stockMicro;
}

const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;

/** RF-15: hacia arriba a presentaciones completas; sin presentación, a milésimas de la unidad base. */
export function roundUp(quantityMicro: bigint, factorMilli: bigint | null): bigint {
  if (quantityMicro <= 0n) return 0n;
  const step = factorMilli ? factorMilli * 1000n : 1000n;
  return ceilDiv(quantityMicro, step) * step;
}

/** RF-16: un renglón de cálculo guardado: sus presentaciones de compra, o su total redondeado hacia arriba. */
export function fromCalculation(totalCentiMicro: bigint, purchase: { factorMilli: bigint; count: number } | null): bigint {
  if (purchase) return BigInt(purchase.count) * purchase.factorMilli * 1000n;
  return roundUp(ceilDiv(totalCentiMicro, 100n), null);
}

/** RF-10: un producto repetido se suma en un solo renglón, que conserva lo demás del primero. */
export function mergeLines<T extends { productId: string; quantityMicro: bigint }>(lines: T[]): T[] {
  const out: T[] = [];
  for (const line of lines) {
    const found = out.find((x) => x.productId === line.productId);
    if (found) found.quantityMicro += line.quantityMicro;
    else out.push({ ...line });
  }
  return out;
}
