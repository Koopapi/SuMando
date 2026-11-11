import type { RandomSource } from "@/server/ports/random";

/** Aleatorio predecible: un contador que no se repite, así dos contraseñas temporales seguidas salen distintas. */
export class FakeRandom implements RandomSource {
  private n = 0;
  bytes(length: number) {
    return Uint8Array.from({ length }, () => this.n++ & 0xff);
  }
  int(maxExclusive: number) {
    return this.n++ % maxExclusive;
  }
}
