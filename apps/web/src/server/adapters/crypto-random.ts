import { randomBytes, randomInt } from "node:crypto";
import type { RandomSource } from "../ports/random";

export const cryptoRandom: RandomSource = {
  bytes: (length) => new Uint8Array(randomBytes(length)),
  int: (maxExclusive) => randomInt(maxExclusive),
};
