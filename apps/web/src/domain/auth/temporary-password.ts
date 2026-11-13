// RF-11: contraseña temporal de 10 caracteres sin los ambiguos 0, O, 1, l, I.
export const TEMP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
export const TEMP_LENGTH = 10;

/** `randomInt(max)` devuelve un entero uniforme en [0, max); lo inyecta el servicio desde su fuente aleatoria. */
export function generateTemporaryPassword(randomInt: (maxExclusive: number) => number): string {
  let out = "";
  for (let i = 0; i < TEMP_LENGTH; i++) out += TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)];
  return out;
}
