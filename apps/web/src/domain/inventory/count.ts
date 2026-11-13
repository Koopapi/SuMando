// Conteo físico (spec 005, RF-46, RF-47, RF-49 a RF-52). La diferencia se calcula contra la existencia al aplicar;
// lo que no se capturó no cambia.

/** RF-46: «Igual» captura lo esperado. RF-47: «Lo que falta, igual» lo hace con todo lo que siga sin capturar. */
export function fillMissing<T extends string>(captured: Record<T, string | undefined>, expected: Record<T, string>): Record<T, string> {
  const out = { ...captured } as Record<T, string>;
  for (const key of Object.keys(expected) as T[]) if (captured[key] === undefined || captured[key] === "") out[key] = expected[key];
  return out;
}

export interface CountedLine {
  productId: string;
  /** Lo contado, en millonésimas de la unidad base. */
  countedMicro: bigint;
  /** La existencia que vio quien contó al abrir el conteo. */
  seenMicro: bigint;
}

export interface CountResultLine {
  productId: string;
  expectedMicro: bigint;
  countedMicro: bigint;
  differenceMicro: bigint;
}

/** RF-49, RF-50, RF-52: solo los capturados, con la diferencia contra la existencia actual. */
export function countResult(lines: CountedLine[], current: Map<string, bigint>): CountResultLine[] {
  return lines.map((l) => {
    const expectedMicro = current.get(l.productId) ?? 0n;
    return { productId: l.productId, expectedMicro, countedMicro: l.countedMicro, differenceMicro: l.countedMicro - expectedMicro };
  });
}

/** RF-51: productos cuya existencia cambió entre que se abrió el conteo y se aplica. */
export function changedSinceOpened(lines: CountedLine[], current: Map<string, bigint>): { productId: string; seenMicro: bigint; nowMicro: bigint }[] {
  return lines.filter((l) => (current.get(l.productId) ?? 0n) !== l.seenMicro).map((l) => ({ productId: l.productId, seenMicro: l.seenMicro, nowMicro: current.get(l.productId) ?? 0n }));
}
