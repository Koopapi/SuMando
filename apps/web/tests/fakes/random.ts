import type { RandomSource } from "@/server/ports/random";

/** Aleatorio predecible: devuelve bytes e índices en secuencia. */
export class FakeRandom implements RandomSource {
  private i = 0;
  constructor(private readonly seq: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {}
  bytes(length: number) {
    return Uint8Array.from({ length }, () => this.next() & 0xff);
  }
  int(maxExclusive: number) {
    return this.next() % maxExclusive;
  }
  private next() {
    return this.seq[this.i++ % this.seq.length];
  }
}
