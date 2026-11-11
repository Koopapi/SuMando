import type { Clock } from "./clock";
import type { PasswordHasher } from "./password-hasher";
import type { RandomSource } from "./random";

export type { Clock, PasswordHasher, RandomSource };

/** Todo lo que un servicio necesita del mundo exterior, inyectable. */
export interface Ports {
  clock: Clock;
  hasher: PasswordHasher;
  random: RandomSource;
}
