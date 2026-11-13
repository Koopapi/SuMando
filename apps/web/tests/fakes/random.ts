import type { RandomSource } from "@/server/ports/random";

/** Aleatorio predecible: un contador que no se repite, así dos contraseñas temporales seguidas salen distintas. */
export class FakeRandom implements RandomSource {
  private n = 0;
  private calls = 0;
  /** Los primeros 4 bytes llevan el número de llamada: dos llamadas nunca dan lo mismo (claves de archivo, spec 008). */
  bytes(length: number) {
    const call = this.calls++;
    return Uint8Array.from({ length }, (_, i) => (i < 4 ? (call >>> (8 * (3 - i))) & 0xff : this.n++ & 0xff));
  }
  int(maxExclusive: number) {
    return this.n++ % maxExclusive;
  }
}
