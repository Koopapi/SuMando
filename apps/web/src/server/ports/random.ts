/** Fuente aleatoria: tokens de sesión y contraseñas temporales. */
export interface RandomSource {
  bytes(length: number): Uint8Array;
  /** Entero uniforme en [0, maxExclusive). */
  int(maxExclusive: number): number;
}
