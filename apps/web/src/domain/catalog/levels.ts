// Mínimo y máximo de un producto en un almacén (spec 003, RF-22, RF-24, RF-25), en la misma unidad.
export function levelsProblem(min: bigint | null, max: bigint | null): "negative" | "max_below_min" | null {
  if ((min !== null && min < 0n) || (max !== null && max < 0n)) return "negative";
  if (min !== null && max !== null && max < min) return "max_below_min";
  return null;
}
