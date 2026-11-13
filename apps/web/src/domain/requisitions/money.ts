// Importes de compra (spec 007, RF-30, RF-31): pesos con hasta 2 decimales, en centavos, sin flotantes.
const MONEY = /^(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/;

export const MONEY_MAX_CENTS = 99_999_999_999n;

/** «1,234.50» → 123450; vacío = null; inválido o negativo = undefined. */
export function parseMoney(raw: string | null | undefined): bigint | null | undefined {
  const text = (raw ?? "").trim().replace(/^\$\s*/, "");
  if (text === "") return null;
  if (!MONEY.test(text)) return undefined;
  const [int, frac = ""] = text.replace(/,/g, "").split(".");
  const cents = BigInt(int) * 100n + BigInt(frac.padEnd(2, "0"));
  return cents > MONEY_MAX_CENTS ? undefined : cents;
}

/** RF-31: con importes por renglón, el total del grupo es su suma. */
export function groupTotal(total: bigint | null, lineAmounts: (bigint | null)[]): bigint | null {
  const given = lineAmounts.filter((a): a is bigint => a !== null);
  return given.length ? given.reduce((a, b) => a + b, 0n) : total;
}

export const centsToText = (cents: bigint) => `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
